import {inferSchema, initParser, Parser, Schema} from 'udsv'
import {LocalCode, LocalOntology} from '..'
import {db} from './db'

type ManifestEntry = {
  num_codes: number
  name: string
  ontology_id: string
}
type Manifest = {
  files: ManifestEntry[]
}
type syncDBOptions = {
  baseUrl: string
  tokenLookup: () => Promise<string>
  onProgress?: (progress: number) => void
}
const syncDB = async ({baseUrl, tokenLookup, onProgress}: syncDBOptions) => {
  const token = await tokenLookup()
  const manifestReq = await fetch(`${baseUrl}assets/manifest.json`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const manifest: Manifest = (await manifestReq.json()) as Manifest

  const countChecks = await Promise.all(
    manifest.files.map(
      async (entry) => entry.num_codes == (await db.codes.where({ontology_id: entry.ontology_id}).count()),
    ),
  )
  const allCountsCorrect = countChecks.every(Boolean)
  if (allCountsCorrect) return

  onProgress?.(0)
  let progress = 0

  // if there is any mismatch, clear and load everything again.
  await db.codes.clear()
  await db.ontologies.clear()

  const totalCount = manifest.files.reduce((i, e) => i + e.num_codes, 0)

  const _syncResults = manifest.files.map(async (entry) => {
    const req = await fetch(`${baseUrl}assets/${entry.name}`, {
      headers: {Authorization: `Bearer ${token}`},
    })

    const blob = await req.blob()
    const stream = blob.stream()?.pipeThrough(new DecompressionStream('gzip'))
    const textStream = stream.pipeThrough(new TextDecoderStream())

    const [countStream, processStream] = textStream.tee()

    let cnt = 0
    const csvStreamCount = countStream.pipeThrough<LocalCode[]>(new CSVTransformStream())
    for await (const strChunk of csvStreamCount) {
      cnt += strChunk.length
    }

    if (cnt !== entry.num_codes) return false

    // build ontology
    const ontology: Partial<LocalOntology> = {}
    ontology.root_code_ids = []
    const csvStream = processStream.pipeThrough<LocalCode[]>(new CSVTransformStream(true))

    let cx = 0
    for await (const x of csvStream) {
      if (!ontology.name) {
        ontology.name = x[0].ontology_id
      }
      ontology.root_code_ids.push(...x.filter((c) => c.path.length === 1).map((c) => c.id))
      cx += x.length
      progress += x.length
      onProgress?.(Math.round((progress / totalCount) * 100))
      await db.codes.bulkPut(x)
    }

    await db.ontologies.put(ontology as LocalOntology)
    console.log('inserted: ', cx, 'actual:', cnt)

    return true
  })

  const syncResults = await Promise.all(_syncResults)
  const allSyncCorrect = syncResults.every(Boolean)
  if (!allSyncCorrect) throw new DBSyncError('SYNC_DB_MISMATCH')

  onProgress?.(100)
}

export default syncDB

export class DBSyncError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DBSyncError'
    Object.setPrototypeOf(this, DBSyncError.prototype)
  }
}

class CSVTransformStream extends TransformStream {
  private parser?: Parser
  private schema?: Schema

  constructor(typeDeep = false) {
    super({
      transform: (chunk, controller) => {
        if (this.parser === undefined) {
          this.schema = inferSchema(chunk as string)
          this.schema.cols.find((c) => c.name === 'code')!.type = 's'
          this.parser = initParser(this.schema)
        }

        return new Promise((resolve) => {
          this.parser?.chunk(chunk, typeDeep ? this.parser.typedDeep : this.parser.stringArrs, (parsed) => {
            controller.enqueue(parsed)
          })

          resolve()
        })
      },
      flush: () => {
        this.parser?.end()
      },
    })
  }
}
