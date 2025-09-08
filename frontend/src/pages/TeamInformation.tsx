import { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { Box, CssBaseline, Stack, TextField, Typography } from '@mui/material';
import AppTheme from '../shared-theme/AppTheme';
import SideMenu from '../dashboard/components/SideMenu';
import {
  dataGridCustomizations,
  treeViewCustomizations,
} from '../dashboard/theme/customizations';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import Chip from '@mui/material/Chip';
import { API_BASE } from "../lib/api";

const xThemeComponents = {
  ...dataGridCustomizations,
  ...treeViewCustomizations,
};

type TeamMemberRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  skills: string[];
};

export default function TeamInformation(props: { disableCustomTheme?: boolean }) {
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [skills, setSkills] = useState('');
  const [rows, setRows] = useState<TeamMemberRow[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMemberRow | null>(null);

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 180 },
    { field: 'role', headerName: 'Role', flex: 1.5, minWidth: 200 },
    {
      field: 'skills',
      headerName: 'Skills',
      flex: 2,
      minWidth: 250,
      renderCell: (params) => (
        <Box
          className="MuiDataGrid-scrollbar MuiDataGrid-scrollbar--horizontal"
          tabIndex={-1}
          onMouseDown={(e) => e.stopPropagation()}
          sx={{
            width: 1,
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'thin',
            py: 0.5,
            px: 1
          }}
        >
          <Stack direction="row" spacing={1} sx={{ pr: 2, width: 'max-content' }}>
            {(params.value as string[]).map((s, i) => (
              <Chip key={i} label={s} size="small" sx={{ whiteSpace: 'nowrap' }} />
            ))}
          </Stack>
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      minWidth: 120,
      renderCell: (params) => (
        <>
          <IconButton onClick={() => handleEditOpen(params.row)} color="primary">
            <EditIcon />
          </IconButton>
          <IconButton onClick={() => handleDelete(params.row.email)} color="error">
            <DeleteIcon />
          </IconButton>
        </>
      ),
    }
  ];

  // Function to fetch data from FastAPI
  const loadTeamMembers = async () => {
    try {
      const res = await fetch(`${API_BASE}/team_members`);
      const data = await res.json();
      const processed = data.map((item: any, index: number) => ({
        ...item,
        id: (index + 1).toString(),
        skills: item.skills.map((s: any) => (typeof s === 'string' ? s : s.S)),
      }));
      setRows(processed);
    } catch (err) {
      console.error('Failed to fetch team members:', err);
    }
  };

  // Load team members when page loads
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
      alert("Please fill in all fields.");
      return;
    }
    if (!_emailRegex.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    const newMember = {
      name,
      email,
      role,
      skills: skills.split(',').map(s => s.trim()),
    };

    try {
      await fetch(`${API_BASE}/add_team_member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMember),
      });

      await loadTeamMembers(); // Team members are re-fetched from DynamoDB after adding

      // Form is cleared
      setName('');
      setEmail('');
      setRole('');
      setSkills('');
    } catch (err) {
      console.error('Error adding team member:', err);
      alert('Failed to add team member');
    }
  };

  const handleDelete = async (email: string) => {
    if (!window.confirm("Are you sure you want to delete this team member?")) return;

    try {
      await fetch(`${API_BASE}/team_member/${email}`, {
        method: 'DELETE',
      });
      await loadTeamMembers();
    } catch (err) {
      console.error("Failed to delete member:", err);
      alert("Failed to delete team member.");
    }
  };

  const handleEditOpen = (member: TeamMemberRow) => {
    setEditMember(member);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editMember) return;
    try {
      await fetch(`${API_BASE}/team_member/${editMember.email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editMember.name,
          email: editMember.email,
          role: editMember.role,
          skills: editMember.skills,
        }),
      });
      setEditOpen(false);
      await loadTeamMembers();
    } catch (err) {
      console.error("Failed to update member:", err);
      alert("Failed to update team member.");
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
            <Typography variant="h4" sx={{ mt: 2 }}>
              Team Members
            </Typography>

            <TextField
              label="Search"
              variant="outlined"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 300 }}
            />

            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <TextField label="Role" value={role} onChange={(e) => setRole(e.target.value)} />
              <TextField label="Skills (comma-separated)" value={skills} onChange={(e) => setSkills(e.target.value)} />
              <Button variant="outlined" onClick={handleSubmit}>Add</Button>
            </Stack>

            <DataGrid
              rows={filteredRows}
              columns={columns}
              disableRowSelectionOnClick
            />
            <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
              <DialogTitle>Edit Team Member</DialogTitle>
              <DialogContent>
                <TextField
                  margin="dense"
                  label="Name"
                  fullWidth
                  value={editMember?.name || ''}
                  onChange={(e) => setEditMember(prev => prev && { ...prev, name: e.target.value })}
                />
                <TextField
                  margin="dense"
                  label="Role"
                  fullWidth
                  value={editMember?.role || ''}
                  onChange={(e) => setEditMember(prev => prev && { ...prev, role: e.target.value })}
                />
                <TextField
                  margin="dense"
                  label="Skills (comma-separated)"
                  fullWidth
                  value={editMember?.skills.join(', ') || ''}
                  onChange={(e) =>
                    setEditMember(prev =>
                      prev && { ...prev, skills: e.target.value.split(',').map(s => s.trim()) }
                    )
                  }
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button variant="contained" onClick={handleEditSave}>Save</Button>
              </DialogActions>
            </Dialog>
          </Stack>
        </Box>
      </Box>
    </AppTheme>
  );
}
