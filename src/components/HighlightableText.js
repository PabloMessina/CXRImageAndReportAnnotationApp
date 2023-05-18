import React from 'react';

function HighlightableText({ text, className, index_pair_list=[], highlightColor='#FFFF00' }) {
    if (index_pair_list.length === 0) {
        return <pre className={className}>{text}</pre>;
    }
    const spans = [];
    let last_index = 0;
    console.log(index_pair_list);
    for (const [start, end] of index_pair_list) {
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