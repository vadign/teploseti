import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { z } from 'zod';
import eventsData from '../data/events.json';
import networkData from '../data/network.json';
import regulationsData from '../data/regulations.json';
import {
  DeviationEvent,
  DigitalTwin,
  District,
  NetEdge,
  NetNode,
  RegulationRef,
  Severity
} from '../types';
import { classifyEdgeLayer } from '../utils';

dayjs.extend(isSameOrBefore);

const nodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.union([z.literal('source'), z.literal('junction'), z.literal('heat_substation')]),
  address: z.string().optional(),
  district: z.union([z.literal('Советский'), z.literal('Октябрьский'), z.literal('Кольцово')]),
  x: z.number(),
  y: z.number()
});

const edgePlanSchema = z.object({
  diameter_mm: z.number(),
  flow_kg_s_plan: z.number(),
  pressure_bar_plan: z.number(),
  temp_c_plan_min: z.number().optional(),
  temp_c_plan_max: z.number().optional()
});

const edgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  directed: z.boolean(),
  plan: edgePlanSchema
});

const networkSchema = z.object({
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema)
});

const ruleSchema = z.object({
  id: z.string(),
  regulationId: z.string(),
  version: z.string()
});

const eventSchema = z.object({
  id: z.string(),
  objectType: z.union([z.literal('node'), z.literal('edge')]),
  objectId: z.string(),
  type: z.union([
    z.literal('pressure_low'),
    z.literal('pressure_high'),
    z.literal('temperature_low'),
    z.literal('temperature_high'),
    z.literal('leak_suspected'),
    z.literal('data_completeness')
  ]),
  severity: z.union([z.literal('info'), z.literal('warning'), z.literal('critical')]),
  timestamp: z.string(),
  measuredValue: z.number().optional(),
  expectedMin: z.number().optional(),
  expectedMax: z.number().optional(),
  rule: ruleSchema,
  sourceSystem: z.string().optional(),
  comment: z.string().optional()
});

const regulationSchema = z.object({
  id: z.string(),
  title: z.string(),
  reference: z.string().optional()
});

const parsedNetwork = networkSchema.parse(networkData);
const parsedEvents = z.array(eventSchema).parse(eventsData);
const parsedRegulations = z.array(regulationSchema).parse(regulationsData);

const sortedEvents = [...parsedEvents].sort((a, b) =>
  dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf()
);

const latestEventDate = sortedEvents.length
  ? dayjs(sortedEvents[sortedEvents.length - 1].timestamp)
  : dayjs();

const defaultFilters = {
  severity: [] as Severity[],
  types: [] as DeviationEvent['type'][],
  districts: [] as District[],
  objectId: undefined as string | undefined,
  ruleVersion: undefined as string | undefined,
  dateRange: undefined as [string, string] | undefined
};

const severityOrder: Record<Severity, number> = {
  info: 1,
  warning: 2,
  critical: 3
};

interface FiltersState {
  severity: Severity[];
  types: DeviationEvent['type'][];
  districts: District[];
  objectId?: string;
  ruleVersion?: string;
  dateRange?: [string, string];
}

interface FocusedObject {
  id: string;
  objectType: 'node' | 'edge';
}

interface AppState {
  network: { nodes: NetNode[]; edges: NetEdge[] };
  events: DeviationEvent[];
  regulations: RegulationRef[];
  ui: {
    selectedDate: string;
    filters: FiltersState;
    focusedObject?: FocusedObject;
  };
  setSelectedDate: (date: string) => void;
  setFilters: (filters: Partial<FiltersState>) => void;
  resetFilters: () => void;
  setObjectFilter: (objectId?: string) => void;
  setFocusedObject: (focus?: FocusedObject) => void;
  eventsForDate: (date: string) => DeviationEvent[];
  eventsByObject: (objectId: string) => DeviationEvent[];
  edgeStatus: (edgeId: string) => Severity | 'ok';
  twinFromNode: (nodeId: string) => DigitalTwin | undefined;
  getNodeById: (id: string) => NetNode | undefined;
  getEdgeById: (id: string) => NetEdge | undefined;
  getRegulationById: (id: string) => RegulationRef | undefined;
  getObjectName: (objectId: string) => string | undefined;
  getObjectDistrict: (objectId: string) => District | undefined;
}

const fallbackStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      network: parsedNetwork,
      events: sortedEvents,
      regulations: parsedRegulations,
      ui: {
        selectedDate: latestEventDate.format('YYYY-MM-DD'),
        filters: { ...defaultFilters }
      },
      setSelectedDate: (date) =>
        set((state) => ({
          ui: { ...state.ui, selectedDate: date || latestEventDate.format('YYYY-MM-DD') }
        })),
      setFilters: (filters) =>
        set((state) => ({
          ui: { ...state.ui, filters: { ...state.ui.filters, ...filters } }
        })),
      resetFilters: () =>
        set((state) => ({
          ui: { ...state.ui, filters: { ...defaultFilters } }
        })),
      setObjectFilter: (objectId) =>
        set((state) => ({
          ui: { ...state.ui, filters: { ...state.ui.filters, objectId } }
        })),
      setFocusedObject: (focus) =>
        set((state) => ({
          ui: { ...state.ui, focusedObject: focus }
        })),
      eventsForDate: (date) => {
        const cutoff = dayjs(date).endOf('day');
        return get().events.filter((event) => dayjs(event.timestamp).isSameOrBefore(cutoff));
      },
      eventsByObject: (objectId) => {
        const { network, ui } = get();
        const baseEvents = get().eventsForDate(ui.selectedDate);
        const relatedIds = new Set<string>([objectId]);
        const node = network.nodes.find((item) => item.id === objectId);
        if (node) {
          network.edges.forEach((edge) => {
            if (edge.from === objectId || edge.to === objectId) {
              relatedIds.add(edge.id);
            }
          });
        }
        return baseEvents
          .filter((event) => relatedIds.has(event.objectId))
          .sort((a, b) => dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf());
      },
      edgeStatus: (edgeId) => {
        const { ui } = get();
        const eventsForEdge = get()
          .eventsForDate(ui.selectedDate)
          .filter((event) => event.objectType === 'edge' && event.objectId === edgeId);
        if (!eventsForEdge.length) {
          return 'ok';
        }
        return eventsForEdge.reduce<Severity>((acc, event) =>
          severityOrder[event.severity] > severityOrder[acc] ? event.severity : acc,
        'info');
      },
      twinFromNode: (nodeId) => {
        const { network, regulations } = get();
        const node = network.nodes.find((item) => item.id === nodeId);
        if (!node) {
          return undefined;
        }
        const events = get().eventsByObject(nodeId);
        const counts = events.reduce(
          (acc, event) => {
            acc[event.severity] += 1;
            acc.total += 1;
            return acc;
          },
          { info: 0, warning: 0, critical: 0, total: 0 }
        );
        const connectedEdges = network.edges.filter(
          (edge) => edge.from === nodeId || edge.to === nodeId
        );
        const completenessChecks = [
          Boolean(node.address),
          connectedEdges.length > 0,
          connectedEdges.every((edge) => edge.plan.diameter_mm > 0),
          connectedEdges.some((edge) =>
            edge.plan.temp_c_plan_min !== undefined && edge.plan.temp_c_plan_max !== undefined
          )
        ];
        const completenessPct = Math.round(
          (completenessChecks.filter(Boolean).length / completenessChecks.length) * 100
        );
        const regulationIds = new Set<string>(['FZ-190']);
        events.forEach((event) => regulationIds.add(event.rule.regulationId));
        const regs = regulations.filter((reg) => regulationIds.has(reg.id));
        const sources = new Set<string>(['Справочная модель теплосети']);
        events.forEach((event) => {
          if (event.sourceSystem) {
            sources.add(event.sourceSystem);
          }
        });
        return {
          id: node.id,
          name: node.name,
          type: node.type,
          address: node.address,
          district: node.district,
          eventsCount: counts,
          completenessPct,
          regulations: regs,
          sources: Array.from(sources)
        } satisfies DigitalTwin;
      },
      getNodeById: (id) => get().network.nodes.find((node) => node.id === id),
      getEdgeById: (id) => get().network.edges.find((edge) => edge.id === id),
      getRegulationById: (id) => get().regulations.find((reg) => reg.id === id),
      getObjectName: (objectId) => {
        const node = get().getNodeById(objectId);
        if (node) {
          return node.name;
        }
        const edge = get().getEdgeById(objectId);
        if (edge) {
          const from = get().getNodeById(edge.from)?.name;
          const to = get().getNodeById(edge.to)?.name;
          return from && to ? `${from} → ${to}` : edge.id;
        }
        return undefined;
      },
      getObjectDistrict: (objectId) => {
        const node = get().getNodeById(objectId);
        if (node) {
          return node.district;
        }
        const edge = get().getEdgeById(objectId);
        if (edge) {
          const fromDistrict = get().getNodeById(edge.from)?.district;
          const toDistrict = get().getNodeById(edge.to)?.district;
          return fromDistrict ?? toDistrict;
        }
        return undefined;
      }
    }),
    {
      name: 'sigma-app-state',
      partialize: (state) => ({ ui: state.ui }),
      storage:
        typeof window !== 'undefined'
          ? createJSONStorage(() => window.localStorage)
          : createJSONStorage(() => fallbackStorage)
    }
  )
);

export const getEdgeLayerMap = () => {
  const { edges } = useAppStore.getState().network;
  return edges.reduce<Record<string, 'supply' | 'return'>>((acc, edge) => {
    acc[edge.id] = classifyEdgeLayer(edge) as 'supply' | 'return';
    return acc;
  }, {});
};
