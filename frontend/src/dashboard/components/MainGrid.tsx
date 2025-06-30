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

const initialTasks = [
  { id: '1', title: 'Setup project', status: 'To-Do', label: 'Bug Fix', assignee: '👤', description: '', date: '' },
  { id: '2', title: 'Design UI', status: 'To-Do', label: 'Feature Request', assignee: '👩‍🎨', description: '', date: '' },
  { id: '3', title: 'Implement backend', status: 'In Progress', label: 'Bug Fix', assignee: '👨‍💻', description: '', date: '' },
  { id: '4', title: 'Integrate API', status: 'In Progress', label: 'Feature Request', assignee: '👩‍💻', description: '', date: '' },
  { id: '6', title: 'Deploy to production', status: 'Complete', label: 'Documentation', assignee: '👨‍🏫', description: '', date: '' },
  { id: '7', title: 'Deploy to UAT', status: 'To-Do', label: 'Documentation', assignee: '👨‍🏫', description: '', date: '' }
];

const columns = ['To-Do', 'In Progress', 'Complete'];
const labels = ['All', 'Bug Fix', 'Feature Request', 'Documentation'];

const getLabelIcon = (label: string) => {
  switch (label) {
    case 'Bug Fix':
      return <BugReportIcon fontSize="small" color="error" />;
    case 'Feature Request':
      return <AutoAwesomeIcon fontSize="small" color="primary" />;
    case 'Documentation':
      return <DescriptionIcon fontSize="small" color="info" />;
    default:
      return null;
  }
};

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

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      variant="outlined"
      sx={{ borderRadius: 2, ...style, cursor: 'grab' }}
    >
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {getLabelIcon(task.label)}
            <Typography variant="caption">{task.label}</Typography>
          </Stack>
          <Typography variant="body1">{task.title}</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box flexGrow={1} />
            <Avatar sx={{ width: 24, height: 24, fontSize: 14 }}>{task.assignee}</Avatar>
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
  const [tasks, setTasks] = useState(initialTasks);
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

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id.toString()) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const isOverColumn = columns.includes(over.id.toString());
    const overTask = tasks.find((t) => t.id === over.id.toString());
    const overTaskColumn = overTask?.status;

    if (isOverColumn) {
      setTasks((prev) =>
        prev.map((t) => (t.id === active.id ? { ...t, status: over.id.toString() } : t))
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
        setTasks((prev) =>
          prev.map((t) => (t.id === active.id ? { ...t, status: overTaskColumn } : t))
        );
      }
    }
  };

  const handleAddTask = () => {
    const newId = (tasks.length + 1).toString();
    setTasks([...tasks, { id: newId, ...newTask }]);
    setOpenDialog(false);
    setNewTask({ title: '', label: 'Bug Fix', assignee: '👤', status: 'To-Do', description: '', date: '' });
  };

  const activeTask = tasks.find((t) => t.id === activeId);

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
                      <IconButton size="small" onClick={() => setOpenDialog(true)}>
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

                  {filtered.length === 0 && (
                    <Box sx={{ textAlign: 'center', color: 'text.secondary', fontSize: 14 }}>Add task</Box>
                  )}
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
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
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
