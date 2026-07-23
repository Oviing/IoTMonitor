/**
 * Local OPC UA demo server for testing IoTMonitor without any external endpoint.
 *
 * Exposes a "Demo" folder under Objects with a few changing variables so you can
 * browse, subscribe, and watch values change (and the row flash) in the UI:
 *   - Demo/Counter       : monotonically increasing Int32
 *   - Demo/Random        : random Double in [0, 100)
 *   - Demo/Sine          : sine wave Double
 *   - Demo/Toggle        : Boolean flipping every 2s
 *
 * Run: npm run demo-opcua   (listens on opc.tcp://localhost:4840)
 */
import { OPCUAServer, Variant, DataType } from 'node-opcua';

const PORT = Number(process.env.OPCUA_PORT || 4840);

async function main() {
  const server = new OPCUAServer({
    port: PORT,
    resourcePath: '/UA/IoTMonitorDemo',
    buildInfo: { productName: 'IoTMonitorDemo', buildNumber: '1', buildDate: new Date() },
  });

  await server.initialize();

  const addressSpace = server.engine.addressSpace;
  const namespace = addressSpace.getOwnNamespace();

  const demo = namespace.addFolder(addressSpace.rootFolder.objects, { browseName: 'Demo' });

  let counter = 0;
  setInterval(() => {
    counter += 1;
  }, 1000);

  namespace.addVariable({
    componentOf: demo,
    browseName: 'Counter',
    dataType: 'Int32',
    value: { get: () => new Variant({ dataType: DataType.Int32, value: counter }) },
  });

  namespace.addVariable({
    componentOf: demo,
    browseName: 'Random',
    dataType: 'Double',
    value: { get: () => new Variant({ dataType: DataType.Double, value: Math.random() * 100 }) },
  });

  namespace.addVariable({
    componentOf: demo,
    browseName: 'Sine',
    dataType: 'Double',
    value: {
      get: () => new Variant({ dataType: DataType.Double, value: Math.sin(Date.now() / 1000) }),
    },
  });

  let toggle = false;
  setInterval(() => {
    toggle = !toggle;
  }, 2000);
  namespace.addVariable({
    componentOf: demo,
    browseName: 'Toggle',
    dataType: 'Boolean',
    value: { get: () => new Variant({ dataType: DataType.Boolean, value: toggle }) },
  });

  await server.start();
  const endpoint = server.endpoints[0].endpointDescriptions()[0].endpointUrl;
  console.log(`Demo OPC UA server running at ${endpoint}`);
  console.log('Add this endpoint in IoTMonitor and browse the "Demo" folder.');

  process.on('SIGINT', async () => {
    await server.shutdown();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Failed to start demo OPC UA server:', err);
  process.exit(1);
});
