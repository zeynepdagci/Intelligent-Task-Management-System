import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Paper,
  Avatar,
  Tooltip,
  IconButton,
  useTheme,
  TextField,
  MenuItem,
  Select,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BugReportIcon from '@mui/icons-material/BugReport';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DescriptionIcon from '@mui/icons-material/Description';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  defaultAnimateLayoutChanges,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { useEffect } from 'react';
import { Chip } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

const API_BASE = import.meta.env.VITE_API_BASE as string;

const getLabelIcon = (label: string): React.ReactElement | undefined => {
  switch (label) {
    case 'Bug Fix':
      return <BugReportIcon fontSize="small" color="error" />;
    case 'Feature Request':
      return <AutoAwesomeIcon fontSize="small" color="primary" />;
    case 'Documentation':
      return <DescriptionIcon fontSize="small" color="info" />;
    default:
      return undefined;
  }
};

const getLabelColor = (label: string) => {
  switch (label) {
    case 'Bug Fix':
      return { bg: '#FFEBEE', color: '#C62828' };
    case 'Feature Request':
      return { bg: '#E3F2FD', color: '#1565C0' };
    case 'Documentation':
      return { bg: '#F3E5F5', color: '#6A1B9A' };
    default:
      return { bg: '#E0E0E0', color: '#424242' };
  }
};

const columns = ['To-Do', 'In Progress', 'Complete'];
const labels = ['All', 'Bug Fix', 'Feature Request', 'Documentation'];

function SortableTask({ task }: { task: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: task.id,
    animateLayoutChanges: defaultAnimateLayoutChanges
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? 'all 300ms ease',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto'
  };

  const isOverdue = (dateStr: string) => {
    const today = new Date().toISOString().split("T")[0];
    return dateStr < today;
  };

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderLeft: `4px solid ${getLabelColor(task.label).color}`,
        ...style,
        cursor: 'grab',
        transition: '0.2s',
        '&:hover': {
          boxShadow: 4,
          transform: 'scale(1.01)'
        }
      }}
    >
      <CardContent sx={{ px: 2, py: 1.5 }}>
        <Stack spacing={1}>
          <Chip variant="outlined"
            icon={getLabelIcon(task.label)}
            label={task.label}
            size="small"
            sx={{
              ...getLabelColor(task.label),
              backgroundColor: getLabelColor(task.label).bg,
              color: getLabelColor(task.label).color,
              width: 'fit-content',
              fontWeight: 700
            }}
          />
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            {task.title}
          </Typography>
          <Box height={4} />
          <Stack spacing={1}>
            <Chip
              variant="outlined"
              avatar={
                <Avatar
                  sx={{
                    width: 20,
                    height: 20,
                    fontSize: 12,
                    bgcolor: '#C8E6C9'
                  }}
                >
                  {/* {task.assignee?.[0] || '👤'} */}
                </Avatar>
              }
              label={task.assignee}
              size="small"
              sx={{
                backgroundColor: '#E8F5E9',
                color: '#388E3C',
                width: 'fit-content',
                pl: 0,
                pr: 1,
                '.MuiChip-avatar': {
                  marginLeft: 0,
                  marginRight: 0
                }
              }}
            />

            {task.date && (
              <Chip variant="outlined"
                icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />}
                label={task.date}
                size="small"
                sx={{
                  backgroundColor: isOverdue(task.date) ? '#d816168a' : '#FFF3E0',
                  color: isOverdue(task.date) ? '#C62828' : '#FB8C00',
                  width: 'fit-content',
                  '.MuiChip-icon': {
                    marginRight: 0.5
                  }
                }}
              />
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <Box
      ref={setNodeRef}
      sx={{
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        flexGrow: 1
      }}
    >
      {children}
    </Box>
  );
}

export default function MainGrid() {
  const theme = useTheme();
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedLabel, setSelectedLabel] = useState('All');
  const [openDialog, setOpenDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    label: 'Bug Fix',
    assignee: '👤',
    status: 'To-Do',
    description: '',
    date: ''
  });
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const response = await fetch(`${API_BASE}/tasks`);
        const data = await response.json();
        const backendTasks = data.tasks.map((task: any) => ({
          id: task.task_id,
          title: task.title,
          label: task.label,
          assignee: task.assigned_to,
          status: task.status,
          description: task.description,
          date: task.due_date
        }));
        setTasks(backendTasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      }
    }

    fetchTasks();
  }, []);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id.toString()) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const isOverColumn = columns.includes(over.id.toString());
    const overTask = tasks.find((t) => t.id === over.id.toString());
    const overTaskColumn = overTask?.status;

    let newStatus: string | null = null;

    if (isOverColumn) {
      newStatus = over.id.toString();
      setTasks((prev) =>
        prev.map((t) => (t.id === active.id ? { ...t, status: newStatus } : t))
      );
    } else if (overTask && overTaskColumn) {
      if (activeTask.status === overTaskColumn) {
        const columnTasks = tasks.filter((t) => t.status === activeTask.status);
        const fromIndex = columnTasks.findIndex((t) => t.id === active.id);
        const toIndex = columnTasks.findIndex((t) => t.id === over.id.toString());
        const reordered = arrayMove(columnTasks, fromIndex, toIndex);
        const rest = tasks.filter((t) => t.status !== activeTask.status);
        setTasks([...rest, ...reordered]);
      } else {
        newStatus = overTaskColumn;
        setTasks((prev) =>
          prev.map((t) => (t.id === active.id ? { ...t, status: newStatus } : t))
        );
      }
    }

    if (newStatus) {
      try {
        await fetch(`${API_BASE}/task/${active.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus })
        });
      } catch (error) {
        console.error("Failed to update task status in backend:", error);
      }
    }
  };

  const handleAddTask = async () => {
    try {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: newTask.title,
          label: newTask.label,
          assigned_to: newTask.assignee,
          description: newTask.description,
          due_date: newTask.date,
          status: newTask.status
        })
      });

      const data = await response.json();

      if (response.ok) {
        setTasks([...tasks, {
          id: data.task.task_id,
          ...newTask
        }]);
        setOpenDialog(false);
        setNewTask({ title: '', label: 'Bug Fix', assignee: '👤', status: 'To-Do', description: '', date: '' });
      } else {
        console.error("Failed to create task:", data.detail);
      }
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const activeTask = tasks.find((t) => t.id === activeId);

  async function classifyLabel(description: string): Promise<string> {
    const response = await fetch(`${API_BASE}/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description })
    });
    const data = await response.json();
    return data.label;
  }

  async function suggestAssignee(description: string): Promise<string> {
    const response = await fetch(`${API_BASE}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
    const data = await response.json();
    return data.assigned_to;
  }

  const handleOpenDialog = (column: string) => {
    setNewTask({
      title: '',
      label: '',
      assignee: '👤',
      status: column,
      description: '',
      date: ''
    });
    setOpenDialog(true);
  };

  return (
    <Box sx={{ px: 4, py: 2, width: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Studio Board</Typography>
        <FormControl
          variant="outlined"
          size="small"
          sx={{ minWidth: 160 }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, ml: 1 }}>
            Filter by Label
          </Typography>
          <Select
            labelId="filter-label"
            id="filter-select"
            value={selectedLabel}
            onChange={(e) => setSelectedLabel(e.target.value)}
          >
            {labels.map((label) => (
              <MenuItem key={label} value={label}>{label}</MenuItem>
            ))}
          </Select>
        </FormControl>

      </Box>

      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {columns.map((column) => {
            const filtered = tasks.filter(
              (task) => task.status === column && (selectedLabel === 'All' || task.label === selectedLabel)
            );
            return (
              <Paper
                key={column}
                elevation={3}
                sx={{
                  flex: '1 1 30%',
                  minWidth: 280,
                  p: 2,
                  borderRadius: 3,
                  backgroundColor: theme.palette.background.paper,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Stack spacing={2} sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">{column}</Typography>
                    <Tooltip title="Add task">
                      <IconButton size="small" onClick={() => handleOpenDialog(column)}>
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <DroppableColumn id={column}>
                    <SortableContext items={filtered.map((task) => task.id)} strategy={verticalListSortingStrategy}>
                      {filtered.map((task) => (
                        <SortableTask key={task.id} task={task} />
                      ))}
                    </SortableContext>
                  </DroppableColumn>
                </Stack>
              </Paper>
            );
          })}
        </Box>

        <DragOverlay dropAnimation={{ duration: 300, easing: 'ease' }}>
          {activeTask ? <SortableTask task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Add Task</DialogTitle>
        <DialogContent sx={{ minWidth: 340, width: '100%' }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="subtitle2" mb={0.5} color="text.secondary">
                Title
              </Typography>
              <TextField
                fullWidth
                multiline
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                variant="outlined"
                size="small"
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" mb={0.5} color="text.secondary">
                Label
              </Typography>
              <Select
                fullWidth
                value={newTask.label}
                onChange={(e) => setNewTask({ ...newTask, label: e.target.value })}
                size="small"
              >
                {labels.filter((l) => l !== 'All').map((label) => (
                  <MenuItem key={label} value={label}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <Box>
              <Typography variant="subtitle2" mb={0.5} color="text.secondary">
                Assignee
              </Typography>
              <TextField
                fullWidth
                value={newTask.assignee}
                onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                variant="outlined"
                size="small"
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" mb={0.5} color="text.secondary">
                Description
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={1}
                value={newTask.description}
                onChange={async (e) => {
                  const desc = e.target.value;
                  setNewTask((prev) => ({ ...prev, description: desc }));

                  if (desc.length > 5) {
                    try {
                      const [predictedLabel, suggestedAssignee] = await Promise.all([
                        classifyLabel(desc),
                        suggestAssignee(desc)
                      ]);
                      setNewTask((prev) => ({
                        ...prev,
                        label: predictedLabel,
                        assignee: suggestedAssignee
                      }));
                    } catch (error) {
                      console.error("Prediction or suggestion error:", error);
                    }
                  }
                }}
                variant="outlined"
                size="small"
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" mb={0.5} color="text.secondary">
                Date
              </Typography>
              <TextField
                type="date"
                fullWidth
                value={newTask.date}
                onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                variant="outlined"
                size="small"
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddTask}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
