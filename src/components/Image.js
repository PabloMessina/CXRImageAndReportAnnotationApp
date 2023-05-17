import React, { useState } from 'react';

const button_style = {
    position: 'absolute',
    top: '10px',
    left: '10px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'yellow',
    cursor: 'pointer',
    fontSize: '20px',
}

function Image({ metadata, size, expandCallback }) {
    const { partId, subjectId, studyId, dicomId } = metadata;
    const imagePath = `/api/images-${size}/${partId}/${subjectId}/${studyId}/${dicomId}`;
    if (expandCallback !== undefined) {
        const [isHovered, setIsHovered] = useState(false);
        const handleMouseEnter = () => { setIsHovered(true); };
        const handleMouseLeave = () => { setIsHovered(false); };
        return (
            <div
                style={{ position: 'relative', display: 'inline-block' }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <img src={imagePath} alt="My Image" />
                {isHovered && (
                    <button style={button_style} onClick={expandCallback}>
                    Expand
                    </button>
                )}
            </div>
        );
    } else {
        return (
            <div>
                <img src={imagePath} alt="My Image" />
            </div>
        );
    }
}

export default Image;