import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import Image from './Image';
import Label from './Label';
import CustomLabel from './CustomLabel';
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
    const [reportComment, setReportComment] = useState(report_data.get_report_comment());
    // State associated with GUI interactions
    const [reportIndexPairList, setReportIndexPairList] = useState([]);
    const [highResImageModalVisible, setHighResImageModalVisible] = useState(false);
    const [highResImageMetadata, setHighResImageMetadata] = useState(null);
    const [imageAnnotationModalVisible, setImageAnnotationModalVisible] = useState(false);
    const [imageAnnotationMetadata, setImageAnnotationMetadata] = useState(null);
    const [forceUpdate, setForceUpdate] = useState(false);

    const scrollableDivRef = useRef(null);

    useEffect(() => {
        const handleLabelMouseEnter = (label_name, index_pair_list) => {
            // console.log(`From MainReportView: Label ${label_name} mouse enter`);
            setReportIndexPairList(index_pair_list);
        };
        const handleLabelMouseLeave = (label_name) => {
            // console.log(`From MainReportView: Label ${label_name} mouse leave`);
            setReportIndexPairList([]);
        };
        const handleAnnotateImage = (label_name, image_metadata) => {
            // console.log(`From MainReportView: Annotate image ${label_name}, ${image_metadata}`);
            setImageAnnotationMetadata({ label_name, image_metadata });
            setImageAnnotationModalVisible(true);
        };
        const handleAnnotateImageCustom = (label_index, image_metadata) => {
            // console.log(`From MainReportView: Annotate image custom ${label_index}, ${image_metadata}`);
            setImageAnnotationMetadata({ label_index, image_metadata });
            setImageAnnotationModalVisible(true);
        };

        // Subscribe to events when the component mounts
        subscribe_to_event(APP_EVENTS.LABEL_MOUSE_ENTER, handleLabelMouseEnter);
        subscribe_to_event(APP_EVENTS.LABEL_MOUSE_LEAVE, handleLabelMouseLeave);
        subscribe_to_event(APP_EVENTS.ANNOTATE_IMAGE, handleAnnotateImage);
        subscribe_to_event(APP_EVENTS.ANNOTATE_IMAGE_CUSTOM_LABEL, handleAnnotateImageCustom);
    
        // Unsubscribe from events when the component unmounts
        return () => {
            unsubscribe_from_event(APP_EVENTS.LABEL_MOUSE_ENTER, handleLabelMouseEnter);
            unsubscribe_from_event(APP_EVENTS.LABEL_MOUSE_LEAVE, handleLabelMouseLeave);
            unsubscribe_from_event(APP_EVENTS.ANNOTATE_IMAGE, handleAnnotateImage);
            unsubscribe_from_event(APP_EVENTS.ANNOTATE_IMAGE_CUSTOM_LABEL, handleAnnotateImageCustom);
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

    const handleReportCommentChange = (event) => {
        report_data.set_report_comment(event.target.value);
        setReportComment(event.target.value);
    };

    const handleCreateNewLabelClick = () => {
        // console.log('From MainReportView: Create new label');
        report_data.create_new_empty_custom_label();
        setForceUpdate(!forceUpdate);
        // Scroll to the bottom of the scrollable div, but only after the DOM has been updated
        setTimeout(() => {
            scrollableDivRef.current.scrollTop = scrollableDivRef.current.scrollHeight;
            // scroll upwards a bit to make the new label visible
            scrollableDivRef.current.scrollTop -= 200;
        }, 0);
    };

    const getOnDeleteCustomLabelHandler = (label_index) => {
        return () => {
            // console.log(`From MainReportView: Delete custom label ${label_index}`);
            report_data.delete_custom_label(label_index);
            setForceUpdate(!forceUpdate);
        };
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
    const image_text = `Images (${images.length}):`;
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
    // Custom labels (added by the user)
    const custom_labels = report_data.get_custom_labels();
    let custom_labels_list = [];
    for (let i = 0; i < custom_labels.length; i++) {
        custom_labels_list.push(
            <CustomLabel key={custom_labels[i]['id']} label_index={i} image_metadata_list={image_metadata_list}
                            handleDeleteButtonClicked={getOnDeleteCustomLabelHandler(i)}
            />
        );
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
                    <br />
                    <div className={styles['report-question-wrapper']}>
                        <b>Any comments about this report?</b>
                        <br />
                        <textarea className={styles['report-comment-textarea']}
                            value={reportComment} onChange={handleReportCommentChange} />
                    </div>
                </div>
            </div>
            <div className={styles['right-column']}>
                <div className={styles['labels-header']}>
                    <h2>Labels:</h2>
                </div>
                <div className={styles['labels-container']} ref={scrollableDivRef}>
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
                    {
                        custom_labels_list.length > 0 && (
                            <div>
                                <span className={styles['custom-label-span']}>Custom labels ({custom_labels_list.length})</span>
                                {custom_labels_list}
                            </div>
                        )
                    }

                </div>
                <div className={styles['labels-missing-container']}>
                    <span>Any labels missing?</span>
                    <button onClick={handleCreateNewLabelClick}>Create a new label!</button>
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
                <ImageAnnotationModal metadata={imageAnnotationMetadata} onClose={() => setImageAnnotationModalVisible(false)} />,
                document.body
                )
            )}
        </div>
    );
}

export default MainReportView;