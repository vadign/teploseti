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
    <Header className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">
          <Typography.Title level={4} className="text-ellipsis">
            Сигма · Теплосеть (Новосибирск)
          </Typography.Title>
          <Typography.Text type="secondary" className="text-ellipsis">
            Мониторинг отклонений и регламентов
          </Typography.Text>
        </div>
        <Space.Compact className="topbar-actions">
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
          className="topbar-select"
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
      </div>
      <div className="topbar-right">
        <CalendarOutlined style={{ color: '#1677ff', fontSize: 18 }} />
        <DatePicker
          className="topbar-date-picker"
          value={dayjs(selectedDate)}
          format="DD.MM.YYYY"
          onChange={(value) => {
            const next = value ? value.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
            setSelectedDate(next);
            setFilters({ dateRange: [next, next] });
          }}
        />
      </div>
    </Header>
  );
};

export default Topbar;
