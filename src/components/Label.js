import React, { useState } from 'react';
import { APP_EVENTS, emit_event } from '../app_events';
import styles from './Label.css';
import AgreementRadioButtons from './AgreementRadioButtons';
import FeedbackForLabel from './FeedbackForLabel';
import store from '../store';

function get_draw_grounding_button_on_click_callback(label_name, image_metadata) {
    const callback = () => { emit_event(APP_EVENTS.ANNOTATE_IMAGE, label_name, image_metadata); }
    return callback;
}

function set_index_for_event_callback(callback, index) {
    return (event) => { callback(event, index); };
};

function Label({ name, indexes, image_metadata_list }) {
    // console.log(`Label: {name}, {indexes}, {image_metadata_list}`);

    const report_data = store.get('report_data');
    
    const [forceUpdate, setForceUpdate] = useState(false);
    const [agreement, setAgreement] = useState(report_data.get_agreement_for_gt_label(name));
    const [textAgreement, setTextAgreement] = useState(report_data.get_text_agreement_for_gt_label(name));
    const [labelSource, setLabelSource] = useState(report_data.get_label_source_for_gt_label(name));
    const [isOpen, setIsOpen] = useState(false);

    const handleMouseEnter = () => {
        emit_event(APP_EVENTS.LABEL_MOUSE_ENTER, name, indexes);
    };
    const handleMouseLeave = () => {
        emit_event(APP_EVENTS.LABEL_MOUSE_LEAVE, name);
    };
    const handleAgreementChange = (event) => {
        report_data.set_agreement_for_gt_label(name, event.target.value);
        // console.log(`Label: handleAgreementChange: ${name}, ${event.target.value}`);
        setAgreement(event.target.value);
    };
    const handleTextAgreementChange = (event) => {
        report_data.set_text_agreement_for_gt_label(name, event.target.value);
        setTextAgreement(event.target.value);
    };
    const handleImageGroundingChange = (event, index) => {
        const dicom_id = report_data.get_dicom_id(index);
        report_data.set_has_grounding_for_gt_label(name, dicom_id, event.target.value);
        setForceUpdate(!forceUpdate);
    };
    const handleLabelSourceChange = (event) => {
        report_data.set_label_source_for_gt_label(name, event.target.value);
        setLabelSource(event.target.value);
    };

    const image_grounding_divs = [];
    for (let i = 0; i < image_metadata_list.length; i++) {
        const image_metadata = image_metadata_list[i];
        const visible = report_data.get_has_grounding_for_gt_label(name, image_metadata.dicom_id);
        let draw_grounding_button = null;
        if (visible === "Yes") {
            draw_grounding_button = (
                <button onClick={get_draw_grounding_button_on_click_callback(name, image_metadata)}>
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
                            name={`${name}_image_${i}_${image_metadata.view_pos}`}
                            value="Yes"
                            checked={visible === "Yes"}
                            onChange={has_grounding_change_callback}
                        />
                        Yes
                    </label>
                    <label>
                        <input
                            type="radio"
                            name={`${name}_image_${i}_${image_metadata.view_pos}`}
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
        <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className={styles.label}>
            <FeedbackForLabel labelName={name} className={styles['upper-right-corner-feedback']} />
            <div className={styles['label-name']}>
                {name}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={styles['label-name-toggle-button']}
                >{isOpen ? "-" : "+"}</button>
            </div>
            <div className={isOpen ? styles['label-content-open'] : styles['label-content-closed']}>
                <div className={styles['question']}>Was this label correctly extracted from the report? (See highlighted text on mouse-over.)</div>
                <AgreementRadioButtons name={`textAgreement${name}`} agreement={textAgreement} handleAgreementChange={handleTextAgreementChange}/>
                <div className={styles['question']}>Considering (1) what you see in the images and (2) the patient's history/indication, would you say that this label is accurate?</div>
                <AgreementRadioButtons name={name} agreement={agreement} handleAgreementChange={handleAgreementChange} />
                <div className={styles['question']}>Can this label be observed in the image(s)? If so, please click "Yes" and draw the regions where it's visible.</div>
                <ul>{image_grounding_divs}</ul>
                <div className={styles['question']}>Are the images sufficient to infer the label?</div>
                <div>
                    <ul>
                        <li>
                            <label>
                                <input
                                    type="radio"
                                    name={`additional_info_${name}`}
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
                                    name={`additional_info_${name}`}
                                    value="2"
                                    checked={labelSource === "2"}
                                    onChange={handleLabelSourceChange}
                                />
                                Partially. The images are a bit ambiguous and must be interpreted in light of the patient's indication/history in order to infer the label.
                            </label>
                        </li>
                        <li>
                            <label>
                                <input
                                    type="radio"
                                    name={`additional_info_${name}`}
                                    value="3"
                                    checked={labelSource === "3"}
                                    onChange={handleLabelSourceChange}
                                />
                                No, there is insufficient information. Other exams would be required to infer this label.
                            </label>
                        </li>
                        <li>
                            <label>
                                <input
                                    type="radio"
                                    name={`additional_info_${name}`}
                                    value="4"
                                    checked={labelSource === "4"}
                                    onChange={handleLabelSourceChange}
                                />
                                Does not apply: the label is evidently wrong (either the automatic labelers made a mistake or the report is clearly wrong about this label).
                            </label>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default Label;