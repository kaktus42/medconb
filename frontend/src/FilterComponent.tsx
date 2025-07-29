import {styled} from '@linaria/react'
import {Button, Input, Space, Tooltip} from 'antd'
import {useEffect, useState} from 'react'
import RegexInput, {Mode} from './components/RegexInput'
import InlineHelp from './InlineHelp'

export type Filter = {
  code: string
  mode: Mode
  description: string
}

type FilterComponentProps = {
  onFilterChange: (filter: Filter) => void
  value: Filter
}

const FilterComponent: React.FC<FilterComponentProps> = ({onFilterChange, value}) => {
  const [iv, setInternalValue] = useState(value)
  useEffect(() => {
    setInternalValue(value)
  }, [value])

  const showDescriptionError =
    iv.description.trim().length > 0 && iv.description.trim().length <= 3 && iv.code.trim() === ''
  const isSearchDisabled = showDescriptionError

  const clearDescription = () => {
    setInternalValue({...iv, description: ''})
    if (iv.code.trim() === '') {
      onFilterChange({...iv, description: ''})
    }
  }

  const clearRegex = () => {
    setInternalValue({...iv, code: ''})
    if (iv.description.trim() === '') {
      onFilterChange({...iv, code: ''})
    }
  }

  const clearSearch = () => {
    setInternalValue({code: '', mode: Mode.POSIX, description: ''})
    onFilterChange({code: '', mode: Mode.POSIX, description: ''})
  }

  return (
    <Root>
      <Space>
        <RegexInput
          onChange={(code, mode) => {
            setInternalValue({...iv, mode, code: code ?? ''})
          }}
          onEnter={() => onFilterChange(iv)}
          onClear={clearRegex}
          mode={iv.mode}
          value={iv.code}
        />
        <Tooltip
          title={showDescriptionError ? 'Please enter at least 4 characters for description search' : ''}
          open={showDescriptionError}
          color="red">
          <Input
            size="small"
            onChange={(e) => {
              setInternalValue({...iv, description: e.target.value})
            }}
            placeholder="Search Description (min. 4 characters)"
            value={iv.description}
            allowClear
            onPressEnter={() => onFilterChange(iv)}
            onClear={clearDescription}
            status={showDescriptionError ? 'error' : undefined}
          />
        </Tooltip>
        <Button
          onClick={() => {
            onFilterChange(iv)
          }}
          size="small"
          disabled={isSearchDisabled}>
          Search
        </Button>
        {(iv.code.trim() !== '' || iv.description.trim() !== '') && (
          <Button type="dashed" onClick={clearSearch} size="small">
            Clear Search
          </Button>
        )}
        <InlineHelp
          content={
            'This is the Ontology Viewer Search. The elements of the Ontology View will' +
            ' be filtered according to the search results.' +
            ' A search in the description always searches for the whole text.' +
            ' A search in the code always applies to the whole code.' +
            ' Use "%" and "_" as placeholders for any amount or a single character or' +
            ' switch to regex mode and use regex.'
          }
        />
      </Space>
    </Root>
  )
}

export default FilterComponent

const Root = styled.div`
  padding: 4px;
  text-align: right;
  flex: 1;
`
