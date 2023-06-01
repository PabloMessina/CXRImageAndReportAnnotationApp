import React from "react";
import ReactDOMServer from 'react-dom/server';
import store from "../store";
import styles from "./FeedbackForLabel.css";

const tooltip_div_style = {
    color: 'white',
    // width: '300px',
};

function FeedbackForLabel({ labelName, labelIndex, reportFieldName, className }) {
    const for_gt_label = labelName !== undefined;
    const for_custom_label = labelIndex !== undefined;
    const for_report = reportFieldName !== undefined;
    if (for_gt_label + for_custom_label + for_report !== 1) {
        throw new Error("Exactly one of labelName, labelIndex, reportFieldName must be defined");
    }
    const report_data = store.get('report_data');
    let feedback;
    // let tooltip_id;
    if (for_gt_label) {
        feedback = report_data.get_feedback_for_gt_label_annotations(labelName);
        // tooltip_id = `tooltip-${labelName}`;
    } else if (for_custom_label) {
        feedback = report_data.get_feedback_for_custom_label_annotations(labelIndex);
        // tooltip_id = `tooltip-${labelIndex}`;
    } else if (for_report) {
        feedback = report_data.get_feedback_for_report_annotation(reportFieldName);
        // tooltip_id = `tooltip-${reportFieldName}`;
    }
    if (feedback.done) {
        return (<div className={className}>
                    <span className={styles['complete']}>Annotation complete &#x2713;</span>
                </div>);
    } else if (feedback.hasOwnProperty('messages') && feedback.messages.length > 0) {
        return (<div className={className} data-tooltip-id="my-tooltip"
            data-tooltip-html={ReactDOMServer.renderToStaticMarkup(
            <div style={tooltip_div_style}>
                <ul>{feedback.messages.map((message, index) => {
                        return (<li key={index}>{message}</li>);
                    })
                }</ul>
            </div>
            )}
        >
            <span className={styles['incomplete']}>Annotation incomplete &#x2717;</span>
        </div>);
    } else {
        return (<div className={className}>
            <span className={styles['incomplete']}>Annotation incomplete &#x2717;</span>
        </div>);
    }
}

export default FeedbackForLabel;
