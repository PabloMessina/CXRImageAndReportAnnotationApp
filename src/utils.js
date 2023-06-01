import { APP_NAME } from './config';
import { useState } from 'react';

function getImageUrl(size, partId, subjectId, studyId, dicomId) {
    return `${APP_NAME}/api/images-${size}/${partId}/${subjectId}/${studyId}/${dicomId}`;
}

function useForceUpdate() {
    const [value, setValue] = useState(0); // integer state
    return () => setValue(value => value + 1); // update the state to force render
}

export { getImageUrl, useForceUpdate };