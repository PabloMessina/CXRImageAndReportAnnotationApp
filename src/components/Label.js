import React, { useState } from 'react';
import { APP_EVENTS, emit_event } from '../app_events';
import styles from './Label.css';
import { cloneDeep } from 'lodash';
import AgreementRadioButtons from './AgreementRadioButtons';

function Label({ name, indexes, image_metadata_list }) {
    console.log(`Label: {name}, {indexes}, {image_metadata_list}`);
    
    const [agreement, setAgreement] = useState(null);
    const [imageGroundingData, setImageGroundingData] = useState({});
    const [labelSource, setLabelSource] = useState(null);

    const handleMouseEnter = () => {
        emit_event(APP_EVENTS.LABEL_MOUSE_ENTER, name, indexes);
    };
    const handleMouseLeave = () => {
        emit_event(APP_EVENTS.LABEL_MOUSE_LEAVE, name);
    };
    const handleAgreementChange = (event) => {
        setAgreement(event.target.value);
    };
    const handleImageGroundingChange = (event, index) => {
        const new_image_grounding_data = cloneDeep(imageGroundingData);
        if (!new_image_grounding_data.hasOwnProperty(index)) {
            new_image_grounding_data[index] = {};
        }
        new_image_grounding_data[index].visible = event.target.value;
        setImageGroundingData(new_image_grounding_data);
        console.log('handleImageGroundingChange', new_image_grounding_data);
    };
    const handleLabelSourceChange = (event) => {
        setLabelSource(event.target.value);
    };

    const image_grounding_divs = [];
    for (let i = 0; i < image_metadata_list.length; i++) {
        const image_metadata = image_metadata_list[i];
        let visible;
        if (imageGroundingData.hasOwnProperty(i)) {
            visible = imageGroundingData[i].visible;
        } else {
            visible = null;
        }
        const callback = (event) => { handleImageGroundingChange(event, i); };
        let draw_grounding_button = null;
        if (visible === "Yes") {
            draw_grounding_button = (
                <button>
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
            <div>Is additional information needed to determine if this label is present?</div>
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
                            No, the image(s) are sufficient, the label is clearly visible.
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
                            Yes, the report's indication section (or similar) contains key additional information to infer the label.
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
                            Yes, but information outside of the report is needed.
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