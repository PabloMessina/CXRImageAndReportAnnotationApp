import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import Label from './Label';
import CustomLabel from './CustomLabel';
import HighlightableText from './HighlightableText';
import styles from './MainReportView.css';
import { APP_EVENTS, subscribe_to_event, unsubscribe_from_event } from '../app_events';
import AgreementRadioButtons from './AgreementRadioButtons';
import HighResImageModal from './HighResImageModal';
import ImageAnnotationModal from './ImageAnnotationModal';
import RoundQuestionButton from './RoundQuestionButton';
import FeedbackForLabel from './FeedbackForLabel';
import ImagesDisplayer from './ImagesDisplayer';
import store from '../store';

const CHEXPERT_LINK = "https://github.com/stanfordmlgroup/chexpert-labeler";
const CHEST_IMAGENOME_LINK = "https://physionet.org/content/chest-imagenome/1.0.0/";

const MISSING_LABELS_TOOLTIP_MESSAGE = (
    "By missing labels we mean noteworthy findings, abnormalities, anomalies, patterns, devices, etc., which are visible in the images(s)" +
    " but that the automatic labelers failed to detect and/or the report omitted. " +
    "We added this feature because both the automatic tools and the report are not necessarily perfect and may have missed something."
);

const round_question_button_style = {
    display: 'inline-block',
};

function MainReportView() {

    const report_data = store.get('report_data');

    // console.log("From MainReportView: ", report_data );

    // State that can be initialized from report_data
    const [reportAccuracy, setReportAccuracy] = useState(report_data.get_report_accuracy());
    const [reportCompleteness, setReportCompleteness] = useState(report_data.get_report_completeness());
    const [reportComment, setReportComment] = useState(report_data.get_report_comment());
    const [impressionAccuracy, setImpressionAccuracy] = useState(report_data.get_impression_accuracy());
    // State associated with GUI interactions
    const [reportIndexPairList, setReportIndexPairList] = useState([]);
    const [highResImageModalVisible, setHighResImageModalVisible] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);
    const [imageAnnotationModalVisible, setImageAnnotationModalVisible] = useState(false);
    const [imageAnnotationMetadata, setImageAnnotationMetadata] = useState(null);
    const [forceUpdate, setForceUpdate] = useState(false);
    const scrollContainerRef = useRef(null);

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

    const handleImpressionAccuracyChange = (event) => {
        report_data.set_impression_accuracy(event.target.value);
        setImpressionAccuracy(event.target.value);
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
            const id = report_data.get_last_custom_label_id();
            const elem = document.querySelector(`#custom_label_${id}`);
            const scrollHeight = scrollContainerRef.current.scrollHeight;
            const elemHeight = elem.getBoundingClientRect().height;
            scrollContainerRef.current.scrollTo({
                top: scrollHeight - elemHeight - 100,
                behavior: 'smooth'
            });
        }, 0);
    };

    const handleExpandImageClick = (image_index) => {
        setSelectedImageIndex(image_index);
        setHighResImageModalVisible(true);
    };

    const getOnDeleteCustomLabelHandler = (label_index) => {
        return () => {
            // console.log(`From MainReportView: Delete custom label ${label_index}`);
            report_data.delete_custom_label(label_index);
            setForceUpdate(!forceUpdate);
        };
    };
    
    let image_metadata_list = [];
    // check if metadata has property dicom_id_view_pos_pairs
    const dicom_id_view_pos_pairs = report_data.get_dicom_id_view_pos_pairs();
    if (dicom_id_view_pos_pairs !== undefined) {
        // define a list of images with dicom_ids as props
        for (let i = 0; i < dicom_id_view_pos_pairs.length; i++) {
            image_metadata_list.push(report_data.get_image_metadata(i));
        }
    }
    
    // Labels
    let labels_list = [];
    const label_data = report_data.get_label_data();
    if (label_data !== undefined) {
        // console.log('label_data', label_data);
        for (let i = 0; i < label_data.length; i++) {
            const label = label_data[i]['name'];
            const indexes = label_data[i]['ranges'];
            labels_list.push(<Label key={label} name={label} indexes={indexes}
                image_metadata_list={image_metadata_list}/>);
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
                {/* <ImagesDisplayer width={'500px'} height={'600px'} /> */}
                {/* <ImagesDisplayerWrapper expandCallback={handleExpandImageClick} /> */}
                <ImagesDisplayer expandCallback={handleExpandImageClick} />
                {/* <div className={styles['images-container-wrapper']}>
                    <h2>{image_text}</h2>
                    <div className={styles['images-container']}>
                        {images}
                    </div>
                </div> */}
            </div>
            <div className={styles['middle-column']}>
                <div className={styles['report-container-wrapper']}>
                    <span className={styles['report-title-span']}>Report</span>
                    <span className={styles['filepath-span']}> Filepath: {report_data.get_report_filepath()} </span>
                    <HighlightableText className={styles['report-container']}
                        text={report_data.get_original_report()} index_pair_list={reportIndexPairList} />
                    <h3>General questions about the report:</h3>
                    <div className={styles['report-question-wrapper']}>
                        <FeedbackForLabel reportFieldName="report_accuracy" className={styles['upper-right-corner-feedback']} />
                        <b>Is the information provided by the report accurate?</b>
                        <AgreementRadioButtons name="report_accuracy" agreement={reportAccuracy}
                                            handleAgreementChange={handleReportAccuracyChange}/>
                    </div>
                    <br />
                    <div className={styles['report-question-wrapper']}>
                        <FeedbackForLabel reportFieldName="report_completeness" className={styles['upper-right-corner-feedback']} />
                        <b>Is the report exhaustive/complete (i.e. does it mention all the findings/abnormalities present in the image(s))?</b>
                        <AgreementRadioButtons name="report_completeness" agreement={reportCompleteness}
                                            handleAgreementChange={handleReportCompletenessChange}/>
                    </div>
                    <br />
                    <div className={styles['report-question-wrapper']}>
                        <FeedbackForLabel reportFieldName="impression_accuracy" className={styles['upper-right-corner-feedback']} />
                        <b>Does the <i>impression</i> section provide an accurate and relevant conclusion to the report, given the reason of the exam?</b>
                        <AgreementRadioButtons name="impression_accuracy" agreement={impressionAccuracy}
                                            handleAgreementChange={handleImpressionAccuracyChange}/>
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
                <div className={styles['labels-container']} ref={scrollContainerRef}>
                    <span className={styles['labels-title-span']}>Labels</span>
                    <div>
                        <span className={styles['label-span']}>
                            {labels_list.length} label{labels_list.length > 0 ? 's' : ''} extracted from the report with automatic tools
                        </span>
                        <span className={styles['label-description-span']}>
                            <i>Learn more about how the labels were obtained:
                                <br />
                                <a href={CHEXPERT_LINK} target="_blank" rel="noopener noreferrer">CheXpert Labeler</a>
                                <span> | </span>
                                <a href={CHEST_IMAGENOME_LINK} target="_blank" rel="noopener noreferrer">Chest ImaGenome</a>
                            </i>
                        </span>
                        {labels_list}
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
                    <RoundQuestionButton
                        style={round_question_button_style}
                        tooltip_message={MISSING_LABELS_TOOLTIP_MESSAGE}
                    />
                </div>
            </div>
            {highResImageModalVisible && (
                ReactDOM.createPortal(
                <HighResImageModal imageIndex={selectedImageIndex} onClose={() => setHighResImageModalVisible(false)} />,
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