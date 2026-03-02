const fs = require('fs');
const file = 'src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// replace useState and add required role states
const useStateMatch = "const [loading, setLoading] = useState(false)";
const newStates = \const [loading, setLoading] = useState(false)
  const [requiresRoleSelection, setRequiresRoleSelection] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<string[]>([])\;
content = content.replace(useStateMatch, newStates);

// replace missing PETUGAS_SPT redirect
content = content.replace(
  "        case 'KEPALA_SEKSI':\n          router.push('/dashboard/kepala-seksi')\n          break",
  "        case 'KEPALA_SEKSI':\n          router.push('/dashboard/kepala-seksi')\n          break\n        case 'PETUGAS_SPT':\n          router.push('/dashboard/petugas-spt')\n          break"
);

// replace handleSubmit
const submitBlock = \  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await login(username, password)

      if (result.requiresRoleSelection) {
        setRequiresRoleSelection(true)
        setAvailableRoles(result.availableRoles || [])
      } else if (!result.success) {
        setError(result.error || 'Username atau password salah')
      }
      // Redirect will happen via useEffect when user state updates
    } catch (err) {
      setError('Terjadi kesalahan saat login')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleSelect = async (role: string) => {
    setLoading(true)
    setError('')
    try {
      const result = await login(username, password, role)
      if (!result.success) {
        setError(result.error || 'Gagal memilih role')
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memilih role')
    } finally {
      setLoading(false)
    }
  }\;

content = content.replace(/  const handleSubmit = async \(e: React\.FormEvent\) => \{[\s\S]*?    \}\n  \}/, submitBlock);

// Replace the return block for form (Wait, we can just edit the JSX directly with string replace)
const formStartMatch = '<form className="mt-10 space-y-6" onSubmit={handleSubmit}>';
const newForm = \{requiresRoleSelection ? (
            <div className="mt-10 space-y-4">
              <h3 className="text-lg font-medium text-slate-800 text-center mb-6">Pilih Peran Anda</h3>
              <div className="grid gap-3">
                {availableRoles.map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleSelect(r)}
                    disabled={loading}
                    className="w-full relative flex items-center justify-center py-3.5 px-4 border border-slate-200 rounded-xl bg-white hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed group overflow-hidden"
                  >
                    <span>{r.replace('_', ' ')}</span>
                    <ArrowRight className="w-5 h-5 absolute right-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4 transition-all" />
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setRequiresRoleSelection(false);
                  setPassword('');
                }}
                disabled={loading}
                className="w-full mt-4 text-sm text-slate-500 hover:text-slate-700"
              >
                Kembali
              </button>
            </div>
          ) : (
            <form className="mt-10 space-y-6" onSubmit={handleSubmit}>\;
content = content.replace(formStartMatch, newForm);

// Add closing brace for the form rendering
content = content.replace(
  '              </button>\n            </div>\n          </form>',
  '              </button>\n            </div>\n          </form>\n          )}'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Done modifying page.tsx');
