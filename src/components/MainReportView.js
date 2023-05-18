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
import ImageAnnotationModal from './ImageAnnotationModal';
import store from '../store';

const LABEL_NAMES = ['chexpert_labels', 'chest_imagenome_labels', 'common_labels'];
const CHEXPERT_LINK = "https://github.com/stanfordmlgroup/chexpert-labeler";
const CHEST_IMAGENOME_LINK = "https://physionet.org/content/chest-imagenome/1.0.0/";

const round_question_button_style = {
    display: 'inline-block',
    marginLeft: '5px',
};

function MainReportView() {

    const report_data = store.get('report_data');

    // console.log("From MainReportView: ", report_data );

    // State that can be initialized from report_data
    const [reportAccuracy, setReportAccuracy] = useState(report_data.get_report_accuracy());
    const [reportCompleteness, setReportCompleteness] = useState(report_data.get_report_completeness());
    // State associated with GUI interactions
    const [reportIndexPairList, setReportIndexPairList] = useState([]);
    const [highResImageModalVisible, setHighResImageModalVisible] = useState(false);
    const [highResImageMetadata, setHighResImageMetadata] = useState(null);
    const [imageAnnotationModalVisible, setImageAnnotationModalVisible] = useState(false);
    const [imageAnnotationMetadata, setImageAnnotationMetadata] = useState(null);

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

    useEffect(() => {
        const handleAnnotateImage = (label_name, image_metadata) => {
            console.log(`From MainReportView: Annotate image ${label_name}, ${image_metadata}`);
            setImageAnnotationMetadata({ label_name, image_metadata });
            setImageAnnotationModalVisible(true);
        };
        subscribe_to_event(APP_EVENTS.ANNOTATE_IMAGE, handleAnnotateImage);
        return () => {
            unsubscribe_from_event(APP_EVENTS.ANNOTATE_IMAGE, handleAnnotateImage);
        };
    }, []);

    const handleReportAccuracyChange = (event) => {
        report_data.set_report_accuracy(event.target.value);
        setReportAccuracy(event.target.value);
    };

    const handleReportCompletenessChange = (event) => {
        report_data.set_report_completeness(event.target.value);
        setReportCompleteness(event.target.value);
    };

    // Define a list of images
    let images = [];
    let image_metadata_list = [];

    // check if metadata has property dicom_id_view_pos_pairs
    const dicom_id_view_pos_pairs = report_data.get_dicom_id_view_pos_pairs();
    // console.log('DEBUG');
    // console.log('dicom_id_view_pos_pairs', dicom_id_view_pos_pairs);
    // console.log('report_data', report_data);
    // console.log('report_data._metadata', report_data._metadata);
    // console.log('report_data._annotations', report_data._annotations);

    if (dicom_id_view_pos_pairs !== undefined) {
        const partId = report_data.get_part_id();
        const subjectId = report_data.get_subject_id();
        const studyId = report_data.get_study_id();
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
    const image_text = `Images (${images.length})`;
    // Labels
    let labels_list = [[], [], []];
    for (let i = 0; i < 3; i++) {
        const label_data = report_data.get_label_data(LABEL_NAMES[i]);
        if (label_data !== undefined) {
            const keys = Object.keys(label_data);
            keys.sort();
            for (let j = 0; j < keys.length; j++) {
                const label = keys[j];
                const indexes = label_data[label];
                labels_list[i].push(<Label key={label} name={label} indexes={indexes}
                                           image_metadata_list={image_metadata_list}/>);
            }
        }
    }
    return (
        <div className={styles['container']}>
            <div className={styles['left-column']}>
                <div className={styles['images-container-wrapper']}>
                    <h2>{image_text}</h2>
                    <div className={styles['images-container']}>
                        {images}
                    </div>
                </div>
            </div>
            <div className={styles['middle-column']}>
                <div className={styles['report-container-wrapper']}>
                    <h2>Report:</h2>
                    <span> Filepath: {report_data.get_report_filepath()} </span>
                    <HighlightableText className={styles['report-container']}
                        text={report_data.get_original_report()} index_pair_list={reportIndexPairList} />
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
            {imageAnnotationModalVisible && (
                ReactDOM.createPortal(
                <ImageAnnotationModal labelName={imageAnnotationMetadata["label_name"]}
                                      imageMetadata={imageAnnotationMetadata["image_metadata"]}
                                      onClose={() => setImageAnnotationModalVisible(false)} />,
                document.body
                )
            )}
        </div>
    );
}

export default MainReportView;