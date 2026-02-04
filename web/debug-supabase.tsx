import React, { useEffect, useState } from 'react';

export default function DebugSupabase() {
  const [logs, setLogs] = useState<string[]>([]);
  const [envVars, setEnvVars] = useState({ url: '', key: '' });

  useEffect(() => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
    
    setEnvVars({ url, key: key.substring(0, 20) + '...' });
    
    const addLog = (message: string) => {
      setLogs(prev => [...prev, message]);
    };

    addLog(`URL: ${url}`);
    addLog(`Key length: ${key.length}`);
    addLog(`Key starts with: ${key.substring(0, 10)}`);

    // Test direct fetch
    if (url && key) {
      addLog('Testing direct fetch...');
      
      fetch(`${url}/rest/v1/budgets?select=*`, {
        method: 'GET',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        addLog(`Response status: ${response.status}`);
        addLog(`Response headers: ${JSON.stringify([...response.headers.entries()])}`);
        return response.text();
      })
      .then(text => {
        addLog(`Response body: ${text}`);
      })
      .catch(error => {
        addLog(`Fetch error: ${error.message}`);
      });
    } else {
      addLog('Missing URL or key');
    }
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '12px' }}>
      <h3>Supabase Debug</h3>
      <div style={{ marginBottom: '20px' }}>
        <strong>Environment Variables:</strong>
        <div>URL: {envVars.url}</div>
        <div>Key: {envVars.key}</div>
      </div>
      <div>
        <strong>Logs:</strong>
        {logs.map((log, i) => (
          <div key={i} style={{ marginBottom: '4px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}
