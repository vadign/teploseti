import dayjs from 'dayjs';
import {
  District,
  EventType,
  NetEdge,
  NetNode,
  NodeType,
  Severity
} from './types';

export const severityTitles: Record<Severity, string> = {
  info: 'Информация',
  warning: 'Предупреждение',
  critical: 'Критично'
};

export const severityColors: Record<Severity, string> = {
  info: 'blue',
  warning: 'gold',
  critical: 'red'
};

export const nodeTypeLabels: Record<NodeType, string> = {
  source: 'Источник теплоснабжения',
  junction: 'Узел сети',
  heat_substation: 'Тепловой узел'
};

export const eventTypeLabels: Record<EventType, string> = {
  pressure_low: 'Низкое давление',
  pressure_high: 'Высокое давление',
  temperature_low: 'Низкая температура',
  temperature_high: 'Высокая температура',
  leak_suspected: 'Подозрение на утечку',
  data_completeness: 'Полнота данных'
};

export const districts: District[] = ['Советский', 'Октябрьский', 'Кольцово'];

export const formatDateTime = (value: string) => dayjs(value).format('DD.MM.YYYY HH:mm');

export const formatDate = (value: string) => dayjs(value).format('DD.MM.YYYY');

export const formatValueRange = (
  measured?: number,
  expectedMin?: number,
  expectedMax?: number
) => {
  const pieces: string[] = [];
  if (typeof measured === 'number') {
    pieces.push(`Факт: ${measured}`);
  }
  if (typeof expectedMin === 'number' || typeof expectedMax === 'number') {
    const range = `${expectedMin ?? '–'} … ${expectedMax ?? '–'}`;
    pieces.push(`Ожидание: ${range}`);
  }
  return pieces.join(' | ');
};

export const getEdgeDirectionLabel = (edge: NetEdge, nodes: NetNode[]) => {
  const from = nodes.find((n) => n.id === edge.from);
  const to = nodes.find((n) => n.id === edge.to);
  if (!from || !to) {
    return edge.id;
  }
  return `${from.name} → ${to.name}`;
};

export const classifyEdgeLayer = (edge: NetEdge) =>
  edge.plan.pressure_bar_plan <= 2.5 ? 'return' : 'supply';
