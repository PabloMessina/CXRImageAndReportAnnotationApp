import React from 'react';

function AgreementRadioButtons({ name, agreement, handleAgreementChange, percent_list }) {
    const label_list = percent_list.map((percent) => {
        return (
            <label key={percent}>
                <input
                    type="radio"
                    name={`agreement_${name}`}
                    value={percent}
                    checked={agreement === percent}
                    onChange={handleAgreementChange}
                />
                {percent}
            </label>
        );
    });
    return (
        <div>{label_list}</div>
    );
}

export default AgreementRadioButtons;