import { Breadcrumb } from 'antd';
import { ReactNode, useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAppStore } from '../app/store';

const Breadcrumbs = () => {
  const location = useLocation();
  const params = useParams();
  const getObjectName = useAppStore((state) => state.getObjectName);
  const focused = useAppStore((state) => state.ui.focusedObject);
  const objectFilter = useAppStore((state) => state.ui.filters.objectId);

  const items = useMemo(() => {
    const crumbs: { title: ReactNode }[] = [];
    crumbs.push({ title: <Link to="/graph">Граф теплосети</Link> });

    if (location.pathname.startsWith('/events')) {
      crumbs.push({ title: 'Реестр событий' });
      if (objectFilter) {
        const name = getObjectName(objectFilter) ?? objectFilter;
        crumbs.push({ title: name });
      }
    } else if (location.pathname.startsWith('/dt')) {
      crumbs.push({ title: <Link to="/events">Цифровые двойники</Link> });
      const twinId = params.id;
      if (twinId) {
        const name = getObjectName(twinId) ?? twinId;
        crumbs.push({ title: name });
      }
    } else if (focused) {
      const name = getObjectName(focused.id) ?? focused.id;
      crumbs.push({ title: name });
    }

    return crumbs;
  }, [focused, getObjectName, location.pathname, objectFilter, params.id]);

  return <Breadcrumb className="breadcrumbs" items={items} />;
};

export default Breadcrumbs;
