import { useEffect, useMemo, useState } from 'react';
import {
  Box, CssBaseline, Stack, TextField, Typography, IconButton, Button, Chip, Avatar, Divider, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EditIcon from '@mui/icons-material/Edit';
import BadgeIcon from '@mui/icons-material/Badge';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import AddIcon from '@mui/icons-material/Add';
import AppTheme from '../shared-theme/AppTheme';
import SideMenu from '../dashboard/components/SideMenu';
import {
  dataGridCustomizations,
  treeViewCustomizations,
} from '../dashboard/theme/customizations';
import { API_BASE } from '../lib/api';

const xThemeComponents = {
  ...dataGridCustomizations,
  ...treeViewCustomizations,
};

export type TeamMemberRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  skills: string[];
};

const getMemberInitials = (fullName: string) => {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return (first + last).toUpperCase();
};

function EditMemberDialog({
  open,
  member,
  onClose,
  onSave,
}: {
  open: boolean;
  member: TeamMemberRow | null;
  onClose: () => void;
  onSave: (memberInfo: Omit<TeamMemberRow, 'id'>) => Promise<void> | void;
}) {
  const [local, setLocal] = useState<Omit<TeamMemberRow, 'id'>>({
    name: '',
    email: '',
    role: '',
    skills: [],
  });
  const [skillsInput, setSkillsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setLocal({ name: member.name, email: member.email, role: member.role, skills: member.skills || [] });
    }
    setSkillsInput('');
    setError(null);
  }, [member, open]);

  const canSave = useMemo(() => {
    return local.name.trim().length > 1 && local.role.trim().length > 0 && local.email.trim().length > 0;
  }, [local]);

  const addSkillFromInput = () => {
    const parts = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (!parts.length) return;
    const merged = Array.from(new Set([...(local.skills || []), ...parts]));
    setLocal((prev) => ({ ...prev, skills: merged }));
    setSkillsInput('');
  };

  const removeSkill = (skill: string) => {
    setLocal((prev) => ({ ...prev, skills: (prev.skills || []).filter((s) => s !== skill) }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkillFromInput();
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    try {
      setSaving(true);
      await onSave(local);
    } catch (e: any) {
      setError(e?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      transitionDuration={{ enter: 140, exit: 100 }}
    >
      <DialogTitle sx={{
        p: 2.5,
        pb: 2,
      }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar sx={{ width: 40, height: 40, fontWeight: 700 }}>
            {getMemberInitials(local.name)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
              Edit Team Member
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {local.email}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 2.5 }}>
        <Stack spacing={2.25}>
          <TextField
            label="Full name"
            value={local.name}
            onChange={(e) => setLocal((p) => ({ ...p, name: e.target.value }))}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <BadgeIcon sx={{ mr: 1 }} />
                  </InputAdornment>
                ),
              },
            }} autoFocus
          />
          <TextField
            label="Role"
            value={local.role}
            onChange={(e) => setLocal((p) => ({ ...p, role: e.target.value }))}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <WorkOutlineIcon sx={{ mr: 1 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Skills
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
              {(local.skills || []).map((skill) => (
                <Chip key={skill} label={skill} onDelete={() => removeSkill(skill)} size="small" />
              ))}
              {!local.skills?.length && (
                <Typography variant="body2" color="text.secondary">
                  There are no skills listed yet
                </Typography>
              )}
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                placeholder="Type a skill and press enter"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button onClick={addSkillFromInput} variant="outlined" startIcon={<AddIcon />}>
                Add
              </Button>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!canSave || saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogActions>

      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError(null)}>
        <Alert severity="error" variant="filled" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}

export default function TeamInformation(props: { disableCustomTheme?: boolean }) {
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [skills, setSkills] = useState('');
  const [rows, setRows] = useState<TeamMemberRow[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMemberRow | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>(
    { open: false, message: '', severity: 'success' }
  );

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMemberRow | null>(null);
  const [deleting, setDeleting] = useState(false);


  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 180 },
    { field: 'role', headerName: 'Role', flex: 1.25, minWidth: 160 },
    {
      field: 'skills',
      headerName: 'Skills',
      flex: 2,
      minWidth: 260,
      renderCell: (params) => (
        <Box
          tabIndex={-1}
          onMouseDown={(e) => e.stopPropagation()}
          sx={{ width: 1, overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'thin', py: 0.5, px: 1 }}
        >
          <Stack direction="row" spacing={1} sx={{ pr: 2, width: 'max-content' }}>
            {(params.value as string[]).map((s: string, i: number) => (
              <Chip key={`${s}-${i}`} label={s} size="small" sx={{ whiteSpace: 'nowrap' }} />
            ))}
          </Stack>
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      minWidth: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton onClick={() => handleEditOpen(params.row)} color="primary" size="small" aria-label="Edit">
            <EditIcon />
          </IconButton>
          <IconButton
            onClick={() => { setDeleteTarget(params.row); setDeleteOpen(true); }}
            color="error"
            size="small"
            aria-label="Delete"
          >
            <DeleteIcon />
          </IconButton>
        </Stack>
      ),
    },
  ];

  const loadTeamMembers = async () => {
    try {
      const res = await fetch(`${API_BASE}/team_members`);
      const data = await res.json();
      const processed: TeamMemberRow[] = data.map((item: any, index: number) => ({
        ...item,
        id: (index + 1).toString(),
        skills: (item.skills || []).map((s: any) => (typeof s === 'string' ? s : s.S)),
      }));
      setRows(processed);
    } catch (err) {
      console.error('Failed to load team members:', err);
      setToast({ open: true, message: 'Failed to load team members', severity: 'error' });
    }
  };

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const filteredRows = rows.filter((row) => {
    const searchLower = search.toLowerCase();
    return (
      row.name.toLowerCase().includes(searchLower) ||
      row.email.toLowerCase().includes(searchLower) ||
      row.role.toLowerCase().includes(searchLower) ||
      row.skills.join(', ').toLowerCase().includes(searchLower)
    );
  });

  const handleSubmit = async () => {
    const _emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name || !email || !role || !skills) {
      setToast({ open: true, message: 'Please fill in all fields.', severity: 'error' });
      return;
    }
    if (!_emailRegex.test(email)) {
      setToast({ open: true, message: 'Please enter a valid email address.', severity: 'error' });
      return;
    }

    const newMember = {
      name,
      email,
      role,
      skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
    };

    try {
      const res = await fetch(`${API_BASE}/add_team_member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember),
      });

      if (!res.ok) throw new Error('Server error');

      await loadTeamMembers();
      setName('');
      setEmail('');
      setRole('');
      setSkills('');
      setToast({ open: true, message: 'Team member added', severity: 'success' });
    } catch (err) {
      console.error('Failed to add team member:', err);
      setToast({ open: true, message: 'Failed to add team member', severity: 'error' });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`${API_BASE}/team_member/${deleteTarget.email}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Server error');
      setDeleteOpen(false);
      setDeleteTarget(null);
      await loadTeamMembers();
      setToast({ open: true, message: 'Team member removed', severity: 'success' });
    } catch (err) {
      console.error('Failed to delete member:', err);
      setToast({ open: true, message: 'Failed to delete team member', severity: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleEditOpen = (member: TeamMemberRow) => {
    setEditMember(member);
    setEditOpen(true);
  };
  const handleEditSave = async (memberInfo: Omit<TeamMemberRow, 'id'>) => {
    try {
      const res = await fetch(`${API_BASE}/team_member/${memberInfo.email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: memberInfo.name,
          email: memberInfo.email, // email is the partition key (immutable) and it is sent to find the team member with it
          role: memberInfo.role,
          skills: memberInfo.skills,
        }),
      });
      if (!res.ok) throw new Error('Server error');
      setEditOpen(false);
      setEditMember(null);
      await loadTeamMembers();
      setToast({ open: true, message: 'Changes saved', severity: 'success' });
    } catch (err) {
      console.error('Failed to update member:', err);
      setToast({ open: true, message: 'Failed to update team member', severity: 'error' });
    }
  };
  return (
    <AppTheme {...props} themeComponents={xThemeComponents}>
      <CssBaseline enableColorScheme />
      <Box sx={{ display: 'flex' }}>
        <SideMenu />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            backgroundColor: (theme) =>
              theme.vars
                ? `rgba(${theme.vars.palette.background.defaultChannel} / 1)`
                : theme.palette.background.default,
            overflow: 'auto',
          }}
        >
          <Stack spacing={2} sx={{ mx: 3, pb: 5, mt: { xs: 8, md: 0 } }}>
            <Typography variant="h4" sx={{ mt: 2, fontWeight: 800 }}>
              Team Members
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField label="Search" variant="outlined" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: { xs: 1, sm: 300 } }} />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Role" value={role} onChange={(e) => setRole(e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Skills (comma-separated)" value={skills} onChange={(e) => setSkills(e.target.value)} sx={{ flex: 2 }} />
              <Button variant="contained" onClick={handleSubmit} startIcon={<AddIcon />}>Add</Button>
            </Stack>
            <DataGrid
              rows={filteredRows}
              columns={columns}
              disableRowSelectionOnClick
            />
            <EditMemberDialog
              open={editOpen}
              member={editMember}
              onClose={() => setEditOpen(false)}
              onSave={handleEditSave}
            />
            <Dialog
              open={deleteOpen}
              onClose={() => setDeleteOpen(false)}
              fullWidth
              maxWidth="xs"
              transitionDuration={{ enter: 140, exit: 100 }}
            >
              <DialogTitle
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.25, p: 2.25,
                }}
              >
                <DeleteForeverIcon color="error" />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Are you sure?</Typography>
              </DialogTitle>
              <DialogContent sx={{ pt: 2 }}>
                <Typography sx={{ mb: 1 }}>
                  This will permanently remove <b>{deleteTarget?.name}</b> (<i>{deleteTarget?.email}</i>).
                </Typography>
              </DialogContent>
              <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button onClick={() => setDeleteOpen(false)} variant="outlined">Cancel</Button>
                <Button onClick={confirmDelete} color="error" variant="contained" disabled={deleting}>
                  {deleting ? 'Deleting' : 'Delete'}
                </Button>
              </DialogActions>
            </Dialog>
            <Snackbar
              open={toast.open}
              autoHideDuration={2500}
              onClose={() => setToast((t) => ({ ...t, open: false }))}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
              <Alert
                onClose={() => setToast((t) => ({ ...t, open: false }))}
                severity={toast.severity}
                variant="filled"
                sx={{ width: '100%' }}
              >
                {toast.message}
              </Alert>
            </Snackbar>
          </Stack>
        </Box>
      </Box>
    </AppTheme>
  );
}
