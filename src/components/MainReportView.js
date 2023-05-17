import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Image from './Image';
import Label from './Label';
import HighlightableText from './HighlightableText';
import styles from './MainReportView.css';
import { APP_EVENTS, subscribe_to_event, unsubscribe_from_event } from '../app_events';
import RoundQuestionButton from './RoundQuestionButton';
import AgreementRadioButtons from './AgreementRadioButtons';
import HighResImageModal from './HighResImageModal';

const LABEL_NAMES = ['chexpert_labels', 'chest_imagenome_labels', 'common_labels'];
const CHEXPERT_LINK = "https://github.com/stanfordmlgroup/chexpert-labeler";
const CHEST_IMAGENOME_LINK = "https://physionet.org/content/chest-imagenome/1.0.0/";

const round_question_button_style = {
    display: 'inline-block',
    marginLeft: '5px',
};

function MainReportView({ metadata }) {
    console.log("From MainReportView: ", metadata);

    const [reportIndexPairList, setReportIndexPairList] = useState([]);
    const [reportAccuracy, setReportAccuracy] = useState(null);
    const [reportCompleteness, setReportCompleteness] = useState(null);
    const [highResImageModalVisible, setHighResImageModalVisible] = useState(false);
    const [highResImageMetadata, setHighResImageMetadata] = useState(null);

    useEffect(() => {
        const handleLabelMouseEnter = (label_name, index_pair_list) => {
            console.log(`From MainReportView: Label ${label_name} mouse enter`);
            setReportIndexPairList(index_pair_list);
        };
        const handleLabelMouseLeave = (label_name) => {
            console.log(`From MainReportView: Label ${label_name} mouse leave`);
            setReportIndexPairList([]);
        };
    
        // Subscribe to the event when the component mounts
        subscribe_to_event(APP_EVENTS.LABEL_MOUSE_ENTER, handleLabelMouseEnter);
        subscribe_to_event(APP_EVENTS.LABEL_MOUSE_LEAVE, handleLabelMouseLeave);
    
        // Unsubscribe from the event when the component unmounts
        return () => {
            unsubscribe_from_event(APP_EVENTS.LABEL_MOUSE_ENTER, handleLabelMouseEnter);
            unsubscribe_from_event(APP_EVENTS.LABEL_MOUSE_LEAVE, handleLabelMouseLeave);
        };
    }, []);

    const handleReportAccuracyChange = (event) => {
        setReportAccuracy(event.target.value);
    };

    const handleReportCompletenessChange = (event) => {
        setReportCompleteness(event.target.value);
    };

    // Define a list of images
    let images = [];
    let image_metadata_list = [];

    // check if metadata has property dicom_id_view_pos_pairs
    if (metadata.hasOwnProperty("dicom_id_view_pos_pairs")) {
        const partId = metadata["part_id"];
        const subjectId = metadata["subject_id"];
        const studyId = metadata["study_id"];
        const dicom_id_view_pos_pairs = metadata["dicom_id_view_pos_pairs"];
        // define a list of images with dicom_ids as props
        for (let i = 0; i < dicom_id_view_pos_pairs.length; i++) {
            const [dicomId, viewPos] = dicom_id_view_pos_pairs[i];
            image_metadata_list.push({ partId, subjectId, studyId, dicomId, viewPos });
            const image_metadata = image_metadata_list[i];
            images.push(
                <div key={dicomId}>
                    <p>ViewPos: {viewPos}, dicomId: {dicomId}</p>
                    <Image metadata={image_metadata} size="medium" expandCallback={() => {
                        setHighResImageMetadata(image_metadata);
                        setHighResImageModalVisible(true);
                    }} />
                </div>
            );
        }
    }
    const image_text = images.length + " " + (images.length > 1 ? "images" : "image");
    // Labels
    let labels_list = [[], [], []];
    for (let i = 0; i < 3; i++) {
        const label_name = LABEL_NAMES[i];
        if (metadata.hasOwnProperty(label_name)) {
            const labels = metadata[label_name];
            // console.log("labels: ", labels);
            const keys = Object.keys(labels);
            // console.log("keys: ", keys);
            keys.sort();
            for (let j = 0; j < keys.length; j++) {
                const label = keys[j];
                const indexes = labels[label];
                labels_list[i].push(<Label key={label} name={label} indexes={indexes}
                                           image_metadata_list={image_metadata_list}/>);
            }
        }
    }
    return (
        <div className={styles['container']}>
            <div className={styles['left-column']}>
                <div className={styles['images-container-wrapper']}>
                    <p>{image_text}</p>
                    <div className={styles['images-container']}>
                        {images}
                    </div>
                </div>
            </div>
            <div className={styles['middle-column']}>
                <div className={styles['report-container-wrapper']}>
                    <h2>Report:</h2>
                    <HighlightableText className={styles['report-container']}
                        text={metadata["original_report"]} index_pair_list={reportIndexPairList} />
                    <br />
                    <div className={styles['report-question-wrapper']}>
                        <b>How accurate is this report?</b>
                        <AgreementRadioButtons name="report_accuracy" agreement={reportAccuracy}
                                            handleAgreementChange={handleReportAccuracyChange}
                                            percent_list={["0%", "25%", "50%", "75%", "100%"]} />
                    </div>
                    <br />
                    <div className={styles['report-question-wrapper']}>
                        <b>How complete is this report?</b>
                        <AgreementRadioButtons name="report_completeness" agreement={reportCompleteness}
                                            handleAgreementChange={handleReportCompletenessChange}
                                            percent_list={["0%", "25%", "50%", "75%", "100%"]} />
                    </div>
                </div>
            </div>
            <div className={styles['right-column']}>
                <div>
                    <span className={styles['label-span']}>Labels detected only by CheXpert ({labels_list[0].length})
                        <RoundQuestionButton link={CHEXPERT_LINK} style={round_question_button_style} />
                    </span>
                    {labels_list[0]}
                </div>
                <div>
                    <span className={styles['label-span']}>Labels detected only by Chest ImaGenome ({labels_list[1].length})
                        <RoundQuestionButton link={CHEST_IMAGENOME_LINK} style={round_question_button_style} />
                    </span>
                    {labels_list[1]}
                </div>
                <div>
                    <span className={styles['label-span']}>Labels detected by both labelers ({labels_list[2].length})</span>
                    {labels_list[2]}
                </div>
            </div>
            {highResImageModalVisible && (
                ReactDOM.createPortal(
                <HighResImageModal imageMetadata={highResImageMetadata} onClose={() => setHighResImageModalVisible(false)} />,
                document.body
                )
            )}
        </div>
    );
}

export default MainReportView;