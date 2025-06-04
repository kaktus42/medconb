import {styled} from '@linaria/react'
import {Button, Form, Input, Divider} from 'antd'
import React from 'react'
import CompanyLogo from '../assets/images/company_logo_color.png'

type LoginScreenProps = {
  loginOptions: {dev: boolean; msal: boolean; password: boolean}
  i18n: Record<string, string>
  handleMsalLogin: () => void
}
const LoginScreen: React.FC<LoginScreenProps> = ({loginOptions, i18n, handleMsalLogin}) => {
  const handleEmailLogin = () => {}

  return (
    <LoginRoot>
      <div>
        <Box>
          {loginOptions.password && (
            <>
              <Form layout="horizontal" onFinish={handleEmailLogin} labelCol={{span: 8}} wrapperCol={{span: 16}}>
                <Form.Item label="Email" name="email" rules={[{required: true, message: 'Please input your email!'}]}>
                  <Input type="email" placeholder="Enter your email" />
                </Form.Item>
                <Form.Item
                  label="Password"
                  name="password"
                  rules={[{required: true, message: 'Please input your password!'}]}>
                  <Input.Password placeholder="Enter your password" />
                </Form.Item>
                <Form.Item wrapperCol={{span: 24}} style={{textAlign: 'center', marginBottom: 0}}>
                  <Button type="primary" htmlType="submit">
                    Sign in with Password
                  </Button>
                </Form.Item>
              </Form>
              <Divider style={{margin: '16px 0'}} />
            </>
          )}
          {loginOptions.msal && (
            <>
              <LogoContainer>
                <img height="100%" src={CompanyLogo} />
              </LogoContainer>
              <Button type="primary" onClick={handleMsalLogin} block>
                Sign in using your {i18n.companyName} account
              </Button>
              <Divider style={{margin: '16px 0'}} />
            </>
          )}
          {loginOptions.dev && (
            <Button block type="text" onClick={() => (document.location.href = '?dev_auth=1')}>
              Sign in using dev token
            </Button>
          )}
        </Box>
      </div>
    </LoginRoot>
  )
}

export default LoginScreen

const LoginRoot = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
`
const Box = styled.div`
  background: #f1f2f5;
  border: 1px solid #f1f2f5;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  padding: 20px;
  justify-content: center;

  > .ant-divider:last-child {
    display: none;
  }
`

const LogoContainer = styled.div`
  height: 100px;
  text-align: center;
  margin-bottom: 20px;
`
