import React from 'react';

function HighlightableText({ text, className, indexPairList=[], highlightColor='#FFFF00' }) {
    if (indexPairList.length === 0) {
        return <pre className={className}>{text}</pre>;
    }
    const spans = [];
    let last_index = 0;
    for (const [start, end] of indexPairList) {
        if (start > last_index) {
            spans.push(<span key={last_index}>{text.slice(last_index, start)}</span>);
        }
        spans.push(<span key={start} style={{ backgroundColor: highlightColor }}>{text.slice(start, end)}</span>);
        last_index = end;
    }
    if (last_index < text.length) {
        spans.push(<span key={last_index}>{text.slice(last_index)}</span>);
    }
    return <pre className={className}>{spans}</pre>;
}

export default HighlightableText;