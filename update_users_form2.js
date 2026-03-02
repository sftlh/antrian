const fs = require('fs');
const file = 'src/app/dashboard/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const strRe1 = \          setUserForm({
            username: '',
            email: '',
            name: '',
            role: 'RECEPTIONIST',
            password: ''
          })\;
          
const strRe2 = \          setUserForm({
            username: '',
            email: '',
            name: '',
            role: 'RECEPTIONIST',
            additionalRoles: [],
            password: ''
          })\;

content = content.replace(strRe1, strRe2);

let formStr = \                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="RECEPTIONIST">Receptionist</option>
                      <option value="HELPDESK">Helpdesk</option>
                      <option value="TPT">TPT</option>
                      <option value="KEPALA_SEKSI">Kepala Seksi</option>
                      <option value="PETUGAS_SPT">Petugas SPT</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>\;

let additionRolesStr = \                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Peran Tambahan (Opsional)</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto p-3 border border-gray-200 rounded-md bg-gray-50">
                      {['RECEPTIONIST', 'HELPDESK', 'TPT', 'KEPALA_SEKSI', 'PETUGAS_SPT', 'ADMIN'].map((roleOpt) => (
                        <div key={roleOpt} className="flex items-center">
                          <input
                            type="checkbox"
                            id={\\\ole-\\\\\\}
                            checked={userForm.additionalRoles?.includes(roleOpt) || false}
                            onChange={() => handleRoleToggle(roleOpt)}
                            disabled={userForm.role === roleOpt}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                          />
                          <label htmlFor={\\\ole-\\\\\\} className="ml-2 block text-sm text-gray-900">
                            {roleOpt.replace('_', ' ')} {userForm.role === roleOpt && '(Peran Utama)'}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>\;

content = content.replace(
  formStr,
  formStr + '\n\n' + additionRolesStr
);

fs.writeFileSync(file, content, 'utf8');
console.log('Done Update Users Form 2');
