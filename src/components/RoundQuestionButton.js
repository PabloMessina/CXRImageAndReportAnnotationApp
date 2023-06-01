import React from 'react';
import ReactDOMServer from 'react-dom/server';
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
const tooltip_div_style = {
    color: 'white',
    width: '250px',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
};
function RoundQuestionButton({ link, style, className, tooltip_message, data_tooltip_id }) {
    if (data_tooltip_id === undefined) {
        data_tooltip_id = "my-tooltip"; // default
    }
    if (tooltip_message === undefined) {
        return (
            <a href={link} title={link} target="_blank" rel="noopener noreferrer" style={style} className={className}            
            >
                <button style={button_style}>?</button>
            </a>
        );
    } else {
        return (
            <a href={link} title={link} target="_blank" rel="noopener noreferrer" style={style} className={className}
                data-tooltip-id={data_tooltip_id} data-tooltip-html={ReactDOMServer.renderToStaticMarkup(
                    <div style={tooltip_div_style}>{tooltip_message}</div>
                )}
            >
                <button style={button_style}>?</button>
            </a>
        );
    }
}

export default RoundQuestionButton;
