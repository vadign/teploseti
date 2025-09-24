import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import GraphView from '../features/graph/GraphView';
import EventsView from '../features/events/EventsView';
import TwinCardView from '../features/dt/TwinCardView';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <GraphView /> },
      { path: 'graph', element: <GraphView /> },
      { path: 'events', element: <EventsView /> },
      { path: 'dt/:id', element: <TwinCardView /> }
    ]
  }
]);
