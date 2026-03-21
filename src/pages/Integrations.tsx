import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Activity, Plug, RefreshCw, Server, Wifi, WifiOff, Clock, ArrowRight, Loader2, CheckCircle2, XCircle, AlertTriangle, Code } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useAuthFetch } from '../contexts/AuthContext';

export function Integrations() {
  const { addToast } = useToast();
  const authFetch = useAuthFetch();
  const [healthData, setHealthData] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState<string | null>(null);

  const apiKey = 'Set via INTEGRATION_API_KEY env var';

  const fetchHealth = async () => {
    try {
      // This calls through the main app's proxy — but integration routes need API key
      // For the dashboard, we use the regular auth to read event logs
      const eventsRes = await authFetch('/api/audit?entity=System&limit=20');
      const eventsData = await eventsRes.json();
      if (eventsData.success) {
        setEvents(eventsData.data?.logs || []);
      }
    } catch { }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchHealth(); }, []);

  // Test HL7v2 message
  const testHl7 = async () => {
    setIsTesting('hl7v2');
    try {
      const sampleMessage = [
        'MSH|^~\\&|EPIC|MFT|ROTAAI|MFT|20260321150000||ADT^A01|TEST001|P|2.4',
        'PID|||P12345^^^MRN||Smith^John||19850315|M',
        'PV1||I|ae^A&E Resus^BED01||||DOC00001^Smith^Sarah^^^Dr',
      ].join('\n');

      const res = await fetch('/api/integration/hl7v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': prompt('Enter your INTEGRATION_API_KEY:') || '',
        },
        body: JSON.stringify({ message: sampleMessage }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`HL7v2 test passed: ${data.data.action} at ${data.data.wardName}`, 'success');
      } else {
        addToast(`HL7v2 test failed: ${data.message}`, 'error');
      }
    } catch (err: any) {
      addToast(`Test failed: ${err.message}`, 'error');
    } finally {
      setIsTesting(null);
    }
  };

  // Test FHIR Encounter
  const testFhir = async () => {
    setIsTesting('fhir');
    try {
      const sampleEncounter = {
        resourceType: 'Encounter',
        id: 'test-encounter-001',
        status: 'in-progress',
        class: { code: 'IMP', display: 'inpatient' },
        subject: { reference: 'Patient/P12345', display: 'John Smith' },
        location: [{
          location: { reference: 'Location/icu', display: 'ICU' },
          status: 'active',
        }],
      };

      const res = await fetch('/api/integration/fhir/Encounter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': prompt('Enter your INTEGRATION_API_KEY:') || '',
        },
        body: JSON.stringify(sampleEncounter),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`FHIR test passed: ${data.data.action} at ${data.data.wardId}`, 'success');
      } else {
        addToast(`FHIR test failed: ${data.message}`, 'error');
      }
    } catch (err: any) {
      addToast(`Test failed: ${err.message}`, 'error');
    } finally {
      setIsTesting(null);
    }
  };

  const integrations = [
    {
      name: 'HL7 FHIR R4',
      description: 'Standard REST API for EHR systems (Epic, Cerner, Oracle Health)',
      endpoint: 'POST /api/integration/fhir/Encounter',
      resources: ['Encounter', 'Bundle'],
      status: 'ready',
      testFn: testFhir,
    },
    {
      name: 'HL7 v2 ADT',
      description: 'Pipe-delimited messages for patient admissions, discharges, transfers',
      endpoint: 'POST /api/integration/hl7v2',
      resources: ['ADT^A01 (Admit)', 'ADT^A02 (Transfer)', 'ADT^A03 (Discharge)'],
      status: 'ready',
      testFn: testHl7,
    },
    {
      name: 'Ward Census Webhook',
      description: 'Direct patient count updates from bed management systems',
      endpoint: 'POST /api/integration/ward-census',
      resources: ['wardId, patients, capacity'],
      status: 'ready',
    },
    {
      name: 'Staff Location',
      description: 'Badge reader integration for real-time staff tracking',
      endpoint: 'POST /api/integration/staff-location',
      resources: ['doctorId, wardId, check-in/check-out'],
      status: 'ready',
    },
    {
      name: 'NEWS2 Scoring',
      description: 'National Early Warning Score 2 for patient acuity',
      endpoint: 'POST /api/integration/news2',
      resources: ['Vital signs observations'],
      status: 'ready',
    },
    {
      name: 'NHS PDS/SDS',
      description: 'NHS Spine for patient demographics and staff verification',
      endpoint: 'Outbound queries',
      resources: ['Patient lookup', 'GMC verification'],
      status: 'requires_key',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground mt-1">Connect RotaAI to hospital systems for live data feeds.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHealth}>
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
      </div>

      {/* How it works */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5">
          <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><Plug className="w-5 h-5" /> How Integration Works</h3>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2"><Server className="w-4 h-4" />Hospital EHR</div>
            <ArrowRight className="w-4 h-4" />
            <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2"><Code className="w-4 h-4" />HL7/FHIR/Webhook</div>
            <ArrowRight className="w-4 h-4" />
            <div className="flex items-center gap-2 bg-primary/20 text-primary rounded-lg px-3 py-2"><Activity className="w-4 h-4" />RotaAI Live Map</div>
          </div>
          <p className="text-sm text-muted-foreground">
            External systems authenticate with an <code className="bg-secondary px-1 rounded">X-API-Key</code> header and push data to these endpoints. RotaAI processes the data, updates ward states, and broadcasts changes to all connected users via WebSocket.
          </p>
        </CardContent>
      </Card>

      {/* Integration cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => (
          <Card key={integration.name} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{integration.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{integration.description}</p>
                </div>
                <Badge variant={integration.status === 'ready' ? 'success' : 'warning'}>
                  {integration.status === 'ready' ? 'Ready' : 'Needs Config'}
                </Badge>
              </div>

              <div className="bg-secondary/50 rounded-lg p-3 mb-3">
                <code className="text-xs font-mono text-primary">{integration.endpoint}</code>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {integration.resources.map((r) => (
                  <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>
                ))}
              </div>

              {integration.testFn && (
                <Button variant="outline" size="sm" className="w-full" onClick={integration.testFn}
                  disabled={isTesting === integration.name.toLowerCase()}>
                  {isTesting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Activity className="w-3.5 h-3.5 mr-1" />}
                  Send Test Message
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Example code snippets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Code className="w-5 h-5 text-primary" />Quick Start Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">HL7v2 ADT Admission</h4>
            <pre className="bg-secondary/50 rounded-lg p-4 text-xs font-mono overflow-x-auto text-foreground">
{`curl -X POST https://your-rotaai.app/api/integration/hl7v2 \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-key" \\
  -d '{"message": "MSH|^~\\\\&|EPIC|MFT|ROTAAI|MFT|20260321||ADT^A01|M001|P|2.4\\nPID|||12345^^^MRN||Smith^John\\nPV1||I|ae^A&E^BED1||||DOC001^Jones^Sarah"}'`}
            </pre>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">FHIR R4 Encounter</h4>
            <pre className="bg-secondary/50 rounded-lg p-4 text-xs font-mono overflow-x-auto text-foreground">
{`curl -X POST https://your-rotaai.app/api/integration/fhir/Encounter \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-key" \\
  -d '{
    "resourceType": "Encounter",
    "id": "enc-001",
    "status": "in-progress",
    "class": {"code": "IMP"},
    "subject": {"reference": "Patient/P001"},
    "location": [{"location": {"reference": "Location/ae", "display": "A&E"}}]
  }'`}
            </pre>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">NEWS2 Patient Acuity</h4>
            <pre className="bg-secondary/50 rounded-lg p-4 text-xs font-mono overflow-x-auto text-foreground">
{`curl -X POST https://your-rotaai.app/api/integration/news2 \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-key" \\
  -d '{
    "wardId": "ae",
    "patientId": "P001",
    "observations": {
      "respirationRate": 22,
      "spO2": 94,
      "isOnSupplementalO2": false,
      "temperature": 38.5,
      "systolicBP": 105,
      "heartRate": 110,
      "consciousness": "alert"
    }
  }'`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
