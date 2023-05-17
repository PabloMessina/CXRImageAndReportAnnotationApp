import React, { useEffect, useState } from 'react';
import MainReportView from './components/MainReportView';
import styles from './App.css';

function App() {

    const [metadata, setMetadata] = useState({});

    useEffect(() => {
        // Make an API request to fetch a default metadata.json file from the server
        fetch('/api/default_metadata')
        // log server status
        .then((response) => {
            console.log('Server status: ', response.status);
            return response;
        })
        .then((response) => response.json())
        .then((data) => { setMetadata(data); })
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
                <MainReportView metadata={metadata} />
            </div>
        </div>
    );
}
  
  export default App;