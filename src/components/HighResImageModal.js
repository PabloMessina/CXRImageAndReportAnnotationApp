import React from "react";
import Image from "./Image";
import styles from "./HighResImageModal.css";

function HighResImageModal({ imageMetadata, onClose }) {
    const { partId, subjectId, studyId, dicomId, viewPos } = imageMetadata;
    const header_text = `High Resolution Image (viewPos: ${viewPos}, partId: ${partId}, ` +
                        `subjectId: ${subjectId}, studyId: ${studyId}, dicomId: ${dicomId})`;
    return (
    <div className={styles["modal-overlay"]}>
        <div className={styles["modal-content"]}>
            <div className={styles["modal-header"]}> {header_text} </div>
            <div className={styles["modal-body"]}>
                <Image metadata={imageMetadata} size="large" />
            </div>
        </div>
        <button className={styles["upper-right-corner-fixed-button"]} onClick={onClose}>Close</button>
    </div>
    );
}

export default HighResImageModal;