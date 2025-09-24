import { CalendarOutlined, ClusterOutlined, DatabaseOutlined } from '@ant-design/icons';
import { Button, DatePicker, Layout, Select, Space, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../app/store';

const { Header } = Layout;

const Topbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedDate = useAppStore((state) => state.ui.selectedDate);
  const setSelectedDate = useAppStore((state) => state.setSelectedDate);
  const setFilters = useAppStore((state) => state.setFilters);
  const setObjectFilter = useAppStore((state) => state.setObjectFilter);
  const nodes = useAppStore((state) => state.network.nodes);

  const activeKey = useMemo(() => {
    if (location.pathname.startsWith('/events')) {
      return 'events';
    }
    if (location.pathname.startsWith('/dt')) {
      return 'dt';
    }
    return 'graph';
  }, [location.pathname]);

  const twinOptions = useMemo(
    () =>
      nodes
        .filter((node) => node.type === 'heat_substation')
        .map((node) => ({
          label: `${node.name}${node.address ? ` — ${node.address}` : ''}`,
          value: node.id
        })),
    [nodes]
  );

  return (
    <Header
      style={{
        background: '#ffffff',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
        zIndex: 20
      }}
    >
      <Space size={24} align="center">
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Сигма · Теплосеть (Новосибирск)
          </Typography.Title>
          <Typography.Text type="secondary">Мониторинг отклонений и регламентов</Typography.Text>
        </div>
        <Space.Compact>
          <Button
            type={activeKey === 'graph' ? 'primary' : 'default'}
            icon={<ClusterOutlined />}
            onClick={() => navigate('/graph')}
          >
            Граф
          </Button>
          <Button
            type={activeKey === 'events' ? 'primary' : 'default'}
            icon={<DatabaseOutlined />}
            onClick={() => navigate('/events')}
          >
            События
          </Button>
        </Space.Compact>
        <Select
          style={{ width: 320 }}
          placeholder="Цифровой двойник"
          value={activeKey === 'dt' ? location.pathname.replace('/dt/', '') : undefined}
          showSearch
          optionFilterProp="label"
          onSelect={(value: string) => {
            setObjectFilter(value);
            navigate(`/dt/${value}`);
          }}
          options={twinOptions}
          allowClear
          onClear={() => {
            if (activeKey === 'dt') {
              navigate('/graph');
            }
          }}
        />
      </Space>
      <Space align="center" size={16}>
        <CalendarOutlined style={{ color: '#1677ff', fontSize: 18 }} />
        <DatePicker
          value={dayjs(selectedDate)}
          format="DD.MM.YYYY"
          onChange={(value) => {
            const next = value ? value.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
            setSelectedDate(next);
            setFilters({ dateRange: [next, next] });
          }}
        />
      </Space>
    </Header>
  );
};

export default Topbar;
