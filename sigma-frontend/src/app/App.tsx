import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import Topbar from '../components/Topbar';

const { Content } = Layout;

const App = () => (
  <Layout className="app-shell">
    <Topbar />
    <Content className="app-content">
      <Breadcrumbs />
      <Outlet />
    </Content>
  </Layout>
);

export default App;
