import React from 'react';
import styles from './AgreementRadioButtons.css';

const defaultProps = {
    optionValues: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
    optionNames: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]
}; // Likert scale

function AgreementRadioButtons({ name, agreement, handleAgreementChange, optionValues, optionNames }) {
    if (!optionValues) {
        optionValues = defaultProps.optionValues;
    }
    if (!optionNames) {
        optionNames = defaultProps.optionNames;
    }
    const pairs = []
    for (let i = 0; i < optionValues.length; i++) {
        pairs.push([optionValues[i], optionNames[i]]);
    }
    // console.log(`AgreementRadioButtons: name=${name}, agreement=${agreement}, optionValues=${optionValues}, optionNames=${optionNames}`);
    const label_list = pairs.map((pair) => {
        const [option_value, option_name] = pair;
        return (
        <label key={option_value} className={styles["likert-option"]}>
            <input
                type="radio"
                name={`agreement_${name}`}
                value={option_value}
                checked={agreement === option_value}
                onChange={handleAgreementChange}
                className={styles["likert-option-input"]}
            />
            <div className={styles['likert-option-text']}>{option_name}</div>
        </label>
        );
    });
    return (
        <div className={styles['likert-options']}>{label_list}</div>
    );
}

export default AgreementRadioButtons;