const fs = require('fs');
const file = 'src/app/dashboard/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update User interface
content = content.replace(
  '  role: string\n  isActive: boolean',
  '  role: string\n  additionalRoles?: string[]\n  isActive: boolean'
);

// Add missing PETUGAS_SPT to standard roles
content = content.replace(
  "                  <option value=\"KEPALA_SEKSI\">Kepala Seksi</option>",
  "                  <option value=\"KEPALA_SEKSI\">Kepala Seksi</option>\n                  <option value=\"PETUGAS_SPT\">Petugas SPT</option>"
);

// We need to find User Modal state to hold multiple roles
const newUserStateMatch = \const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    name: '',
    password: '',
    role: 'RECEPTIONIST',
  })\;
  
const newUserStateReplace = \const [newUser, setNewUser] = useState<{
    username: string;
    email: string;
    name: string;
    password: string;
    role: string;
    additionalRoles: string[];
  }>({
    username: '',
    email: '',
    name: '',
    password: '',
    role: 'RECEPTIONIST',
    additionalRoles: [],
  })\;
  
content = content.replace(newUserStateMatch, newUserStateReplace);

// Same for editing state if present
const editUserStateMatch = \const [editingUser, setEditingUser] = useState<User | null>(null)\;
content = content.replace(editUserStateMatch, \const [editingUser, setEditingUser] = useState<(User & { password?: string, additionalRoles?: string[] }) | null>(null)\);

fs.writeFileSync(file, content, 'utf8');
console.log('Update Admin UI Types Done');
