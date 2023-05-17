import React from 'react';
const button_style = {
    width: '15px',
    height: '15px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'blue',
    color: 'white',
    fontSize: '10px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
};
function RoundQuestionButton({ link, style }) {
    return (
        <a href={link} title={link} target="_blank" rel="noopener noreferrer" style={style}>
            <button style={button_style}>?</button>
        </a>
    );
}

export default RoundQuestionButton;
