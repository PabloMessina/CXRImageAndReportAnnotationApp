import React, { useState } from 'react';
import { APP_EVENTS, emit_event } from '../app_events';
import styles from './Label.css';
import AgreementRadioButtons from './AgreementRadioButtons';
import store from '../store';

function get_draw_grounding_button_on_click_callback(label_name, image_metadata) {
    const callback = () => { emit_event(APP_EVENTS.ANNOTATE_IMAGE, label_name, image_metadata); }
    return callback;
}

function Label({ name, indexes, image_metadata_list }) {
    // console.log(`Label: {name}, {indexes}, {image_metadata_list}`);

    const report_data = store.get('report_data');
    
    const [forceUpdate, setForceUpdate] = useState(false);
    
    const agreement = report_data.get_agreement_for_gt_label(name);
    const labelSource = report_data.get_label_source_for_gt_label(name);

    const handleMouseEnter = () => {
        emit_event(APP_EVENTS.LABEL_MOUSE_ENTER, name, indexes);
    };
    const handleMouseLeave = () => {
        emit_event(APP_EVENTS.LABEL_MOUSE_LEAVE, name);
    };
    const handleAgreementChange = (event) => {
        report_data.set_agreement_for_gt_label(name, event.target.value);
        setForceUpdate(!forceUpdate);
    };
    const handleImageGroundingChange = (event, index) => {
        const dicom_id = report_data.get_dicom_id(index);
        report_data.set_has_grounding_for_gt_label(name, dicom_id, event.target.value);
        setForceUpdate(!forceUpdate);
    };
    const handleLabelSourceChange = (event) => {
        report_data.set_label_source_for_gt_label(name, event.target.value);
        setForceUpdate(!forceUpdate);
    };

    const image_grounding_divs = [];
    for (let i = 0; i < image_metadata_list.length; i++) {
        const image_metadata = image_metadata_list[i];
        const visible = report_data.get_has_grounding_for_gt_label(name, image_metadata.dicomId);
        const callback = (event) => { handleImageGroundingChange(event, i); };
        let draw_grounding_button = null;
        if (visible === "Yes") {
            draw_grounding_button = (
                <button onClick={get_draw_grounding_button_on_click_callback(name, image_metadata)}>
                    Draw Grounding
                </button>
            );
        }
        image_grounding_divs.push(
            <li key={i}>
                <div >
                    <span>Image {i+1} ({image_metadata.viewPos})</span>
                    <label>
                        <input
                            type="radio"
                            name={`${name}_image_${i}_${image_metadata.viewPos}`}
                            value="Yes"
                            checked={visible === "Yes"}
                            onChange={callback}
                        />
                        Yes
                    </label>
                    <label>
                        <input
                            type="radio"
                            name={`${name}_image_${i}_${image_metadata.viewPos}`}
                            value="No"
                            checked={visible === "No"}
                            onChange={callback}
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
            <div><b>{name}</b></div>
            <div className={styles['add-margin-top']}>How much do you agree with this label?</div>
            <AgreementRadioButtons name={name} agreement={agreement} handleAgreementChange={handleAgreementChange}
                                   percent_list={["0%", "25%", "50%", "75%", "100%"]}/>
            <div className={styles['add-margin-top']}>Can this label be observed in the image(s)?</div>
            <ul>{image_grounding_divs}</ul>
            <div>Are the images sufficient to infer the label?</div>
            <div>
                {/* create a bullet list of the following options, using html <ul> and <li> tags */}
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
                            Yes, the image(s) are sufficient, the label is evident.
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
                            No, but the report's indication/history sections provide sufficient complementary information.
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
                            No, information outside of the report (e.g., other exams) is needed.
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
                            Does not apply (the label is evidently wrong or not applicable to the image(s)).
                        </label>
                    </li>
                </ul>
            </div>
        </div>
    );
}

export default Label;