import { useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { Box, CssBaseline, Stack, TextField, Typography } from '@mui/material';
import AppTheme from '../shared-theme/AppTheme';
import SideMenu from '../dashboard/components/SideMenu';
import AppNavbar from '../dashboard/components/AppNavbar';
import {
  chartsCustomizations,
  dataGridCustomizations,
  datePickersCustomizations,
  treeViewCustomizations,
} from '../dashboard/theme/customizations';

const xThemeComponents = {
  ...chartsCustomizations,
  ...dataGridCustomizations,
  ...datePickersCustomizations,
  ...treeViewCustomizations,
};

const rows = [
  {
    id: '1',
    name: 'Riley Carter',
    email: 'riley@email.com',
    role: 'Mobile App Developer',
    skills: ['Java', 'React Native', 'Android'],
  },
  {
    id: '2',
    name: 'Emma Johnson',
    email: 'emma@email.com',
    role: 'DevOps',
    skills: ['AWS', 'Linux', 'Docker'],
  },
];

const columns: GridColDef[] = [
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
  { field: 'email', headerName: 'Email', flex: 1, minWidth: 180 },
  { field: 'role', headerName: 'Role', flex: 1.5, minWidth: 200 },
  {
    field: 'skills',
    headerName: 'Skills',
    flex: 2,
    minWidth: 250,
    renderCell: (params) => params.value.join(', '),
  },
];

export default function TeamInformation(props: { disableCustomTheme?: boolean }) {
  const [search, setSearch] = useState('');

  const filteredRows = rows.filter((row) => {
    const searchLower = search.toLowerCase();
    return (
      row.name.toLowerCase().includes(searchLower) ||
      row.email.toLowerCase().includes(searchLower) ||
      row.role.toLowerCase().includes(searchLower) ||
      row.skills.join(', ').toLowerCase().includes(searchLower)
    );
  });


  return (
    <AppTheme {...props} themeComponents={xThemeComponents}>
      <CssBaseline enableColorScheme />
      <Box sx={{ display: 'flex' }}>
        <SideMenu />
        <AppNavbar />
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

            <Box sx={{ width: '100%' }}>
              <DataGrid
                rows={filteredRows}
                columns={columns}
                disableRowSelectionOnClick
                autoHeight
              />
            </Box>
          </Stack>
        </Box>
      </Box>
    </AppTheme>
  );
}
