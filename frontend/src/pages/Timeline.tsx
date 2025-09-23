import { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Card, CardContent, Typography, Chip, Paper, Tooltip } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { CalendarMonth, Person } from '@mui/icons-material';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { API_BASE } from '../lib/api';
import AppTheme from '../shared-theme/AppTheme';
import SideMenu from '../dashboard/components/SideMenu';
import {
  dataGridCustomizations,
  treeViewCustomizations,
} from '../dashboard/theme/customizations';

const xThemeComponents = {
  ...dataGridCustomizations,
  ...treeViewCustomizations,
};

type TimelineTask = {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  assignee?: string;
  status?: 'To-Do' | 'In Progress' | 'Complete' | string;
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const getStatusColor = (status: any) => {
  switch (status) {
    case 'Complete': return '#4caf50';
    case 'In Progress': return '#ff9800';
    case 'To-Do': return '#9e9e9e';
    default: return '#9e9e9e';
  }
};

function useResizeObserver<T extends HTMLElement>(
  onSize: (rect: DOMRectReadOnly) => void
) {
  const ref = useRef<T | null>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) onSize(e.contentRect);
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [onSize]);
  return ref;
}

function RowMeasure({
  id,
  onHeight,
  children,
}: {
  id: string;
  onHeight: (id: string, h: number) => void;
  children: React.ReactNode;
}) {
  const rowRef = useResizeObserver<HTMLDivElement>((rect) => {
    onHeight(id, rect.height);
  });

  return (
    <Box ref={rowRef} sx={{ mb: `${ROW_GAP}px`, position: 'relative' }}>
      {children}
    </Box>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;
const ROW_GAP = 20;
const BAR_H = 60;

const toUtcMidnight = (d: Date) =>
  new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

const daysDiff = (a: Date, b: Date) => {
  const A = toUtcMidnight(a).getTime();
  const B = toUtcMidnight(b).getTime();
  return Math.floor((B - A) / DAY_MS);
};

const daysDiffInclusive = (a: Date, b: Date) =>
  Math.max(1, daysDiff(a, b) + 1);

const toDate = (v: string | Date | null | undefined) => {
  const d = v instanceof Date ? v : new Date(v as any);
  if (isNaN(d.getTime())) return null;
  return toUtcMidnight(d);
};

const MIN_MONTHS_VISIBLE = 3;

const startOfMonthUTC = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

const endOfMonthUTC = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));

const addMonthsUTC = (d: Date, n: number) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate()));


const TaskCard: React.FC<{ task: TimelineTask }> = ({ task }) => {
  const duration = daysDiffInclusive(task.startDate, task.endDate);

  return (
    <Card
      sx={{
        height: 'auto',
        position: 'relative',
        borderRadius: 2,
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          bgcolor: getStatusColor(task.status),
        },
        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 10px 24px rgba(0,0,0,0.15)',
        },
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Typography
          variant="h6"
          component="h3"
          sx={{
            mb: 2,
            fontWeight: 600,
            color: 'text.primary'
          }}
        >
          {task.title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
              <Person sx={{ fontSize: 16, mr: 0.5 }} />
              Assignee
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {task.assignee}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <CalendarMonth sx={{ fontSize: 16, mr: .5 }} />
            Schedule
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {formatDate(task.startDate)} - {formatDate(task.endDate)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Duration: {duration} days
          </Typography>
        </Box>

        <Chip
          label={(task.status ?? '').toString()}
          size="small"
          sx={{ bgcolor: getStatusColor(task.status), color: 'white', fontWeight: 600, textTransform: 'capitalize' }}
        />
      </CardContent>
    </Card>
  );
};

const GanttTimeline: React.FC<{ tasks: TimelineTask[]; rowHeights: Record<string, number>; rowGap: number; }> = ({ tasks, rowHeights, rowGap }) => {
  const offsets = useMemo(() => {
    const arr: number[] = [];
    let acc = 0;
    for (const t of tasks) {
      arr.push(acc);
      acc += (rowHeights[t.id] ?? 250) + rowGap;
    }
    return arr;
  }, [tasks, rowHeights, rowGap]);

  const totalHeight = useMemo(() => {
    if (!tasks.length) return 0;
    const last = tasks[tasks.length - 1];
    return offsets[offsets.length - 1] + (rowHeights[last.id] ?? 250);
  }, [tasks, offsets, rowHeights]);

  const { minDate, maxDate } = useMemo(() => {
    if (tasks.length > 0) {
      const allDates = tasks.flatMap(t => [t.startDate, t.endDate]);
      const rawMin = toUtcMidnight(new Date(Math.min(...allDates.map(d => d.getTime()))));
      const rawMax = toUtcMidnight(new Date(Math.max(...allDates.map(d => d.getTime()))));

      const startMonth = startOfMonthUTC(rawMin);
      const endNeededForMinMonths = endOfMonthUTC(addMonthsUTC(startMonth, MIN_MONTHS_VISIBLE - 1));
      const finalMax = rawMax > endNeededForMinMonths ? endOfMonthUTC(rawMax) : endNeededForMinMonths;

      return { minDate: startMonth, maxDate: finalMax };
    } else {
      const today = toUtcMidnight(new Date());
      const start = startOfMonthUTC(today);
      const end = endOfMonthUTC(addMonthsUTC(start, MIN_MONTHS_VISIBLE - 1));
      return { minDate: start, maxDate: end };
    }
  }, [tasks]);

  const timelineDays = useMemo(() => {
    const days: Date[] = [];
    for (let t = minDate.getTime(); t <= maxDate.getTime(); t += DAY_MS) {
      days.push(new Date(t));
    }
    return days;
  }, [minDate, maxDate]);

  const totalDays = timelineDays.length;
  const dayWidth = 20;

  const monthSegments = useMemo(() => {
    const monthGroups: { label: string; days: number; startIndex: number }[] = [];
    if (!timelineDays.length) return monthGroups;
    let runMonth = timelineDays[0].getUTCMonth();
    let runYear = timelineDays[0].getUTCFullYear();
    let count = 0;
    let startIndex = 0;

    timelineDays.forEach((d, i) => {
      const m = d.getUTCMonth(), y = d.getUTCFullYear();
      if (m !== runMonth || y !== runYear) {
        monthGroups.push({
          label: new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
            .format(new Date(Date.UTC(runYear, runMonth, 1))),
          days: count,
          startIndex,
        });
        startIndex += count;
        runMonth = m; runYear = y; count = 1;
      } else {
        count++;
      }
      if (i === timelineDays.length - 1) {
        monthGroups.push({
          label: new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
            .format(new Date(Date.UTC(runYear, runMonth, 1))),
          days: count,
          startIndex,
        });
      }
    });
    return monthGroups;
  }, [timelineDays]);

  const getTaskPosition = (task: TimelineTask) => {
    const taskStart = daysDiff(minDate, task.startDate);
    const taskDuration = daysDiffInclusive(task.startDate, task.endDate);
    return {
      left: taskStart * dayWidth,
      width: taskDuration * dayWidth
    };
  };

  const dayLine = 'rgba(15,23,42,0.07)';
  const rowLine = 'rgba(15,23,42,0.10)';
  const monthLine = 'rgba(15,23,42,0.20)';
  const zebra = 'rgba(2,6,23,0.03)';

  return (
    <Box sx={{ width: totalDays * dayWidth, position: 'relative' }}>
      <Box sx={(t) => ({
        position: 'sticky',
        zIndex: t.zIndex.appBar + 1,
        px: 0,
        top: 0,
        border: 1,
        borderColor: 'divider',
        boxShadow: 2,
        bgcolor: '#fff',
        backgroundImage: 'none',
        opacity: 1,
      })}>
        <Box sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider' }}>
          {monthSegments.map((segment, i) => (
            <Box
              key={i}
              sx={{
                width: segment.days * dayWidth,
                textAlign: 'center',
                px: 0.5,
                py: 0.5
              }}
            >
              <Typography variant="caption" noWrap>
                {segment.label}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider' }}>
          {timelineDays.map((day, i) => (
            <Box
              key={i}
              sx={{
                width: dayWidth,
                textAlign: 'center',
                borderRight: i < timelineDays.length - 1 ? 1 : 0,
                borderColor: 'divider',
                px: 0.5,
              }}
            >
              <Typography variant="caption" color="text.secondary" noWrap>
                {day.getUTCDate()}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ position: 'relative', minHeight: totalHeight, marginTop: -3 }}>
        {monthSegments.map((segment, i) => (
          <Box key={`m-bg-${i}`} sx={{
            position: 'absolute',
            left: segment.startIndex * dayWidth, top: 0, bottom: 0,
            width: segment.days * dayWidth,
            bgcolor: i % 2 === 0 ? zebra : 'transparent',
            pointerEvents: 'none', zIndex: 0,
          }} />
        ))}

        {monthSegments.map((segment, i) => (
          <Box key={`m-line-${i}`} sx={{
            position: 'absolute',
            left: segment.startIndex * dayWidth, top: 0, bottom: 0,
            borderLeft: `1px solid ${monthLine}`,
            pointerEvents: 'none', zIndex: 1,
          }} />
        ))}

        <Box sx={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(to right, ${dayLine} 1px, transparent 1px)`,
          backgroundSize: `${dayWidth}px 100%`,
          pointerEvents: 'none', zIndex: 0.5,
        }} />

        {offsets.map((y, i) => (
          <Box key={`rowline-${i}`} sx={{
            position: 'absolute',
            top: y,
            left: 0,
            right: 0,
            borderTop: `1px solid ${rowLine}`,
            pointerEvents: 'none',
            zIndex: 0.5,
          }} />
        ))}

        <Box sx={{ position: 'relative', zIndex: 2 }}>
          {tasks.map((task, i) => {
            const pos = getTaskPosition(task);
            const h = rowHeights[task.id] ?? 250;
            const centerY = offsets[i] + Math.max(0, (h - BAR_H) / 2);
            return (
              <Box key={task.id} sx={{ mb: `${ROW_GAP}px`, position: 'relative' }}>
                <Tooltip title={task.title}>
                  <Box sx={{
                    position: 'absolute',
                    left: pos.left, width: pos.width, height: BAR_H, top: centerY,
                    bgcolor: getStatusColor(task.status),
                    borderRadius: 1, display: 'flex', alignItems: 'center', px: 1,
                    color: 'white', fontWeight: 700,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                    transition: 'opacity .2s ease', '&:hover': { opacity: 0.95 },
                  }}>
                  </Box>
                </Tooltip>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default function Timeline(props: { disableCustomTheme?: boolean }) {
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const handleRowHeight = useCallback((id: string, h: number) => {
    setRowHeights((m) => (m[id] === h ? m : { ...m, [id]: h }));
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API_BASE}/tasks`);
      const data = await res.json();

      const mapped: TimelineTask[] = (data.tasks ?? [])
        .map((task: any): TimelineTask | null => {
          const endRaw = task.end_date ?? task.due_date;
          const startRaw = task.start_date ?? task.created_at;

          const endDate = toDate(endRaw);
          const startDate = toDate(startRaw) ?? (endDate ? toUtcMidnight(new Date(endDate.getTime() - 6 * DAY_MS)) : null);

          if (!endDate || !startDate) return null;

          return {
            id: String(task.task_id ?? task.id ?? ''),
            title: task.title ?? 'Untitled',
            assignee: task.assigned_to ?? undefined,
            status: task.status ?? 'To-Do',
            startDate,
            endDate,
          };
        })
        .filter(Boolean) as TimelineTask[];

      setTasks(mapped);
    })();
  }, []);

  return (
    <AppTheme {...props} themeComponents={xThemeComponents}>
      <CssBaseline enableColorScheme />
      <Box sx={{ display: 'flex' }}>
        <SideMenu />
        <Box
          component="main"
          sx={(t) => ({
            flexGrow: 1,
            minWidth: 0,
            height: '100dvh',
            backgroundColor: t.palette.mode === 'light' ? '#f3f5f8' : t.palette.background.default,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          })}
        >
          <Stack spacing={2} sx={{ mx: 3, pb: 5, mt: { xs: 8, md: 0 }, flexGrow: 1, overflow: 'hidden' }}>
            <Box sx={{ height: 8 }} />

            <Paper
              sx={{
                display: 'grid',
                gridTemplateColumns: '380px 1fr',
                gridAutoRows: 'auto',
                gap: 2,
                overflowY: 'auto',
                overflowX: 'visible',
                minHeight: 0,
                borderColor: 'divider',
                borderRadius: 2,
                backgroundColor: '#fff'
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', pt: 3, pl: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Tasks ({tasks.length})</Typography>
                {tasks.map((task) => {
                  return (
                    <RowMeasure key={task.id} id={task.id} onHeight={handleRowHeight}>
                      <TaskCard task={task} />
                    </RowMeasure>
                  );
                })}
              </Box>

              <Box sx={{ minWidth: 0, overflowY: 'visible' }}>
                <GanttTimeline tasks={tasks} rowHeights={rowHeights} rowGap={ROW_GAP} />
              </Box>
            </Paper>
          </Stack>
        </Box>
      </Box>
    </AppTheme >
  );
}