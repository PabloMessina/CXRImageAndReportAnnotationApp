import React, { useState } from 'react';
import { APP_EVENTS, emit_event } from '../app_events';
import styles from './Label.css';
import AgreementRadioButtons from './AgreementRadioButtons';
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
    const [foundInReport, setFoundInReport] = useState(report_data.get_found_in_report_for_custom_label(label_index));
    const [agreement, setAgreement] = useState(report_data.get_agreement_for_custom_label(label_index));
    const [labelSource, setLabelSource] = useState(report_data.get_label_source_for_custom_label(label_index));

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
        report_data.set_custom_label_name(label_index, event.target.value);
        setLabelName(event.target.value);
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
        const visible = report_data.get_has_grounding_for_custom_label(label_index, image_metadata.dicomId);
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
                    <span>Image {i+1} ({image_metadata.viewPos})</span>
                    <label>
                        <input
                            type="radio"
                            name={`${label_id}_image_${i}_${image_metadata.viewPos}`}
                            value="Yes"
                            checked={visible === "Yes"}
                            onChange={has_grounding_change_callback}
                        />
                        Yes
                    </label>
                    <label>
                        <input
                            type="radio"
                            name={`${label_id}_image_${i}_${image_metadata.viewPos}`}
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

    return (
        <div className={styles.label}>
            <h3>Custom Label {label_index + 1}</h3>
            <div>
                <span>Type a name for this label:</span>
                <br />
                {/* Create a resizable input box */}
                {/* <input
                    type="text"
                    name={`label_name_${label_index}`}
                    value={labelName}
                    onChange={handleLabelNameChange}

                /> */}
                <textarea
                    name={`label_name_${label_id}`}
                    value={labelName}
                    onChange={handleLabelNameChange}
                    rows="1"
                    cols="50"
                    wrap="soft"
                />
            </div>
            <div className={styles['add-margin-top']}>How confident are you that this label is correct?</div>
            <AgreementRadioButtons name={'custom_' + label_id} agreement={agreement}
                                   handleAgreementChange={handleAgreementChange}
                                   percent_list={["0%", "25%", "50%", "75%", "100%"]}/>
            <div className={styles['add-margin-top']}>Is this label mentioned in the report
            (but for some reason the automatic labelers did not detect it)?</div>
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
            <div className={styles['add-margin-top']}>Can this label be observed in the image(s)?</div>
            <ul>{image_grounding_divs}</ul>            
            <div>Are the images sufficient to infer the label?</div>
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
                            Yes, the image(s) are sufficient, the label can be clearly observed.
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
                            No, but the report's indication/history sections provide sufficient
                            complementary information to infer the label.
                        </label>
                    </li>
                    <li>
                        <label>
                            <input
                                type="radio"
                                name={`additional_info_${label_id}`}
                                value="3"
                                checked={labelSource === "3"}
                                onChange={handleLabelSourceChange}
                            />
                            No, information outside of the report (e.g., other exams) is needed.
                        </label>
                    </li>
                    <li>
                        <label>
                            <input
                                type="radio"
                                name={`additional_info_${label_id}`}
                                value="4"
                                checked={labelSource === "4"}
                                onChange={handleLabelSourceChange}
                            />
                            Does not apply (the label is evidently wrong or not applicable to the image(s)).
                        </label>
                    </li>
                </ul>
            </div>
            <button onClick={() => handleDeleteButtonClicked(label_index)}>Delete Label</button>
        </div>
    );
}

export default CustomLabel;