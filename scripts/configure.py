"""Generate public browser configuration from deployment variables. No secret keys."""
import os,json,base64
from pathlib import Path
values={name:os.environ.get(env,'') for name,env in [('supabaseUrl','KDS_SUPABASE_URL'),('supabaseAnonKey','KDS_SUPABASE_PUBLIC_KEY'),('enquiryEndpoint','KDS_ENQUIRY_ENDPOINT')]}
role=''
try:
 payload=values['supabaseAnonKey'].split('.')[1];role=json.loads(base64.urlsafe_b64decode(payload+'='*(-len(payload)%4))).get('role','')
except (ValueError,IndexError,KeyError):pass
if role=='service_role' or values['supabaseAnonKey'].startswith('sb_secret_'):raise SystemExit('Use a publishable/anon key, never a secret key.')
Path(__file__).resolve().parent.parent.joinpath('config.js').write_text('window.KDS_CONFIG = '+json.dumps(values,indent=2)+';\n')
print('Wrote public config.js; no configuration values printed.')
