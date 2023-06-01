import React, { useState } from 'react';
import { APP_EVENTS, emit_event } from '../app_events';
import styles from './Label.css';
import AgreementRadioButtons from './AgreementRadioButtons';
import FeedbackForLabel from './FeedbackForLabel';
import Select from 'react-select';
import store from '../store';

function get_draw_grounding_button_on_click_callback(label_index, image_metadata) {
    const callback = () => { emit_event(APP_EVENTS.ANNOTATE_IMAGE_CUSTOM_LABEL, label_index, image_metadata); }
    return callback;
}

function set_index_for_event_callback(callback, index) {
    return (event) => { callback(event, index); };
};

function CustomLabel({ label_index, image_metadata_list, handleDeleteButtonClicked }) {

    const report_data = store.get('report_data');
    
    const [forceUpdate, setForceUpdate] = useState(false);
    const [labelName, setLabelName] = useState(report_data.get_custom_label_name(label_index));
    const [labelDescription, setLabelDescription] = useState(report_data.get_custom_label_description(label_index));
    const [foundInReport, setFoundInReport] = useState(report_data.get_found_in_report_for_custom_label(label_index));
    const [agreement, setAgreement] = useState(report_data.get_agreement_for_custom_label(label_index));
    const [labelSource, setLabelSource] = useState(report_data.get_label_source_for_custom_label(label_index));
    const [isOpen, setIsOpen] = useState(false);

    const handleAgreementChange = (event) => {
        report_data.set_agreement_for_custom_label(label_index, event.target.value);
        setAgreement(event.target.value);
    };
    const handleImageGroundingChange = (event, index) => {
        const dicom_id = report_data.get_dicom_id(index);
        report_data.set_has_grounding_for_custom_label(label_index, dicom_id, event.target.value);
        setForceUpdate(!forceUpdate);
    };
    const handleLabelSourceChange = (event) => {
        report_data.set_label_source_for_custom_label(label_index, event.target.value);
        setLabelSource(event.target.value);
    };
    const handleLabelNameChange = (event) => {
        // console.log("handleLabelNameChange", event)
        report_data.set_custom_label_name(label_index, event.value);
        setLabelName(event.value);
    };
    const handleLabelDescriptionChange = (event) => {
        report_data.set_custom_label_description(label_index, event.value);
        setLabelDescription(event.value);
    };
    const handleFoundInReportChange = (event) => {
        report_data.set_found_in_report_for_custom_label(label_index, event.target.value);
        setFoundInReport(event.target.value);
    };

    const label_id = report_data.get_custom_label_id(label_index);
    if (label_id === undefined) {
        throw new Error(`Label ID for custom label ${label_index} is undefined`);
    }

    const image_grounding_divs = [];
    for (let i = 0; i < image_metadata_list.length; i++) {
        const image_metadata = image_metadata_list[i];
        const visible = report_data.get_has_grounding_for_custom_label(label_index, image_metadata.dicom_id);
        let draw_grounding_button = null;
        if (visible === "Yes") {
            draw_grounding_button = (
                <button onClick={get_draw_grounding_button_on_click_callback(label_index, image_metadata)}>
                    Draw Grounding
                </button>
            );
        }
        const has_grounding_change_callback = set_index_for_event_callback(handleImageGroundingChange, i);
        image_grounding_divs.push(
            <li key={i}>
                <div >
                    <span>Image {i+1} ({image_metadata.view_pos})</span>
                    <label>
                        <input
                            type="radio"
                            name={`${label_id}_image_${i}_${image_metadata.view_pos}`}
                            value="Yes"
                            checked={visible === "Yes"}
                            onChange={has_grounding_change_callback}
                        />
                        Yes
                    </label>
                    <label>
                        <input
                            type="radio"
                            name={`${label_id}_image_${i}_${image_metadata.view_pos}`}
                            value="No"
                            checked={visible === "No"}
                            onChange={has_grounding_change_callback}
                        />
                        No
                    </label>
                    {draw_grounding_button !== null ? <br /> : null}
                    {draw_grounding_button}
                </div>
            </li>
        );
    }

    const label_name_options = report_data.get_custom_label_options();
    // if (!(labelName === undefined || labelName === null || labelName === "")) {
    //     const label_name_option = { value: labelName, label: labelName };
    //     if (!label_name_options.includes(label_name_option)) {
    //         label_name_options.push(label_name_option);
    //         label_name_options.sort((a, b) => a.label.localeCompare(b.label));
    //     }
    // }

    const label_to_display = labelName || "Custom Label " + (label_index + 1);

    return (
        <div className={styles.label} id={`custom_label_${label_id}`}>
            <FeedbackForLabel labelIndex={label_index} className={styles['upper-right-corner-feedback']} />
            <div className={styles['custom-label-name']}>
                <span>{label_to_display}</span>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={styles['label-name-toggle-button']}
                >{isOpen ? "-" : "+"}</button>
            </div>
            <div className={isOpen ? styles['label-content-open'] : styles['label-content-closed']}>
                <div>
                    <span>Select a name or category for this label:</span>
                    <Select defaultValue={labelName} options={label_name_options} onChange={handleLabelNameChange} />
                    <br />
                    <span>(Optional) If you wish, you can add a more detailed description of this label below:</span>
                    <textarea
                        className={styles['textarea']}
                        name={`label_name_${label_id}`}
                        value={labelDescription}
                        onChange={handleLabelDescriptionChange}
                        rows="1"
                        cols="50"
                        wrap="soft"
                    />
                </div>
                <div className={styles['question']}>Considering (1) what you see in the images and (2) the patient's history/indication, would you say that this label is accurate?</div>
                <AgreementRadioButtons name={'custom_' + label_id} agreement={agreement}
                                    handleAgreementChange={handleAgreementChange}
                />
                <div className={styles['question']}>Does the report mention this label (but for some reason the automatic labelers failed to detect it)?</div>
                <label>
                    <input
                        type="radio"
                        name={`found_in_report_${label_id}`}
                        value="Yes"
                        checked={foundInReport === "Yes"}
                        onChange={handleFoundInReportChange}
                    />
                    Yes
                </label>
                <label>
                    <input
                        type="radio"
                        name={`found_in_report_${label_id}`}
                        value="No"
                        checked={foundInReport === "No"}
                        onChange={handleFoundInReportChange}
                    />
                    No
                </label>
                <div className={styles['question']}>Can this label be observed in the image(s)? If so, please click "Yes" and draw the regions where it's visible.</div>
                <ul>{image_grounding_divs}</ul>            
                <div className={styles['question']}>Are the images sufficient to infer the label?</div>
                <div>
                    <ul>
                        <li>
                            <label>
                                <input
                                    type="radio"
                                    name={`additional_info_${label_id}`}
                                    value="1"
                                    checked={labelSource === "1"}
                                    onChange={handleLabelSourceChange}
                                />
                                Yes, the image(s) are sufficient, the label can be clearly seen.
                            </label>
                        </li>
                        <li>
                            <label>
                                <input
                                    type="radio"
                                    name={`additional_info_${label_id}`}
                                    value="2"
                                    checked={labelSource === "2"}
                                    onChange={handleLabelSourceChange}
                                />
                                Partially. The images are a bit ambiguous and must be interpreted in light of the patient's indication/history in order to infer the label.
                            </label>
                        </li>
                    </ul>
                </div>
                <button onClick={() => handleDeleteButtonClicked(label_index)}>Delete {label_to_display}</button>
            </div>
        </div>
    );
}

export default CustomLabel;