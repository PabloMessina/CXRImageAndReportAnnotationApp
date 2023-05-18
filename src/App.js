import React, { useEffect, useState } from 'react';
import MainReportView from './components/MainReportView';
import styles from './App.css';
import store from './store';
import ReportData from './report_data';
import { APP_NAME } from './config';

function App() {
    
    let report_data;
    if (store.has('report_data')) {
        report_data = store.get('report_data');
    } else {
        // Set an empty report_data object in the store as the default
        report_data = new ReportData();
        store.set('report_data', report_data)
    }

    const [forceUpdate, setForceUpdate] = useState(false);

    useEffect(() => {
        // Make an API request to fetch a default metadata.json file from the server
        fetch(`${APP_NAME}/api/default_metadata`)
        // log server status
        .then((response) => {
            console.log('Server status: ', response.status);
            return response;
        })
        .then((response) => response.json())
        .then((data) => { 
            report_data.set_metadata(data);
            setForceUpdate(!forceUpdate);
            console.log('Success:', report_data);
        })
        .catch((error) => {
            console.error('Error fetching data:', error);
        });
    }, []);

    return (
        <div className={styles.app}>
            <div className={styles.header}>
                <h2>Chest X-ray Image and Report Annotation App</h2>
            </div>
            <div className={styles.content}>
                <MainReportView />
            </div>
        </div>
    );
}
  
  export default App;