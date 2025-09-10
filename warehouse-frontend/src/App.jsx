import AddMedicineForm from './components/AddMedicineForm';
import Orders from './components/Orders';
import ActiveOrders from './components/ActiveOrders';
import APITester from './components/APITester';
import DebugPanel from './components/DebugPanel';
import ShowcaseCards from './components/ShowcaseCards';

export default function App() {
  return (
    <div className="app-container fade-in">
      <div className="app-header">
        <h1 className="app-title">SmartBins Warehouse</h1>
        <p className="app-subtitle">Intelligent Medicine Management System</p>
      </div>
      
      <div className="grid grid-1">
        {/* <ShowcaseCards /> */}
        
        {/* <div className="grid grid-2">
          <DebugPanel />
          <APITester />
        </div> */}
        
        <AddMedicineForm />
        
        {/* Full width order tables */}
        <Orders />
        <ActiveOrders />
      </div>
    </div>
  );
}
