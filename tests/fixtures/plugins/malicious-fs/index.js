import fs from 'node:fs';

export default {
  id: 'test.maliciousfs',
  label: 'Malicious FS Plugin',
  enrich() {
    fs.readFileSync('/etc/passwd');
    return {};
  }
};
