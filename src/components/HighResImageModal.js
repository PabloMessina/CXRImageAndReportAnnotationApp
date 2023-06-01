import React, { useState, useEffect, useRef } from "react";
import styles from "./HighResImageModal.css";
import store from "../store";
import { drawMultiplePolygons } from "../drawing_utils";
import ImageWrapper from "./ImageWrapper";
import RoundQuestionButton from "./RoundQuestionButton";
import { Tooltip } from 'react-tooltip';

const INSTRUCTIONS_TEXT = `Use the controls at the bottom of the image to zoom in and out and to move the image around.

You can also zoom in and out with the mouse wheel or by pressing the + and - keys, and you can move the image around with the arrow keys.

You can also reset the image to its original size and position by pressing 0 or with the ⟳ button at the bottom of the image.`;

function HighResImageModal({ imageIndex, onClose }) {

    const report_data = store.get('report_data');
    
    const [ selectedImageIndex, setSelectedImageIndex ] = useState(imageIndex);
    const [ maxWidthForSelectedImage, setMaxWidthForSelectedImage ] = useState(0);
    const [ maxHeightForSelectedImage, setMaxHeightForSelectedImage ] = useState(0);
    const viewportWrapperRef = useRef(null);

    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            if (viewportWrapperRef.current) {
                const w = viewportWrapperRef.current.clientWidth;
                const h = viewportWrapperRef.current.clientHeight;
                setMaxWidthForSelectedImage(w);
                setMaxHeightForSelectedImage(h);
            }
        });
        if (viewportWrapperRef.current) {
            resizeObserver.observe(viewportWrapperRef.current);
        }
        return () => {
            if (viewportWrapperRef.current) {
                resizeObserver.unobserve(viewportWrapperRef.current);
            }
        };
    }, []);

    const dicom_id_view_pos_pairs = report_data.get_dicom_id_view_pos_pairs();
    const partId = report_data.get_part_id();
    const subjectId = report_data.get_subject_id();
    const studyId = report_data.get_study_id();
    const [dicomId, viewPos] = dicom_id_view_pos_pairs[selectedImageIndex];

    const header_text = `High Resolution Image (viewPos: ${viewPos}, partId: ${partId}, ` +
                        `subjectId: ${subjectId}, studyId: ${studyId}, dicomId: ${dicomId})`;

    const getImageSelectedCallback = (index) => { return () => {
        setSelectedImageIndex(index);
    }};

    const selected_image_metadata = report_data.get_image_metadata(selectedImageIndex);

    const canvasDrawCallback = (canvas) => {
        const canvas_width = canvas.width;
        const canvas_height = canvas.height;
        const context = canvas.getContext('2d');
        const [polygons, label_names] = report_data.get_all_polygons_for_dicom_id(
            dicomId, canvas.width, canvas.height, true);
        // console.log(`From HighResImageModal: canvasDrawCallback: dicomId = ${dicomId}, polygons.length = ${polygons.length}`);
        context.clearRect(0, 0, canvas_width, canvas_height);
        drawMultiplePolygons(context, polygons, label_names);
    };

    // list of images (thumbnails)
    let image_list = [];
    for (let i = 0; i < dicom_id_view_pos_pairs.length; i++) {
        const [dicomId, viewPos] = dicom_id_view_pos_pairs[i];
        const image_metadata = report_data.get_image_metadata(i);
        const class_name = (i === selectedImageIndex) ? styles['image-list-item-selected'] : styles['image-list-item'];
        image_list.push(
            <div key={dicomId} onClick={getImageSelectedCallback(i)} className={class_name}>
                <ImageWrapper maxWidth={100} maxHeight={100} useAllSpace={true}
                              metadata={image_metadata} size="small"/>
                <span className={styles['image-list-item-span']}>{(i+1)}) {viewPos}</span>
            </div>
        );
    }

    return (
        <div className={styles["modal-overlay"]}>
            <div className={styles["modal-content"]}>
                <div className={styles["modal-header"]}> {header_text} </div>
                <div className={styles["modal-body"]}>
                    <div className={styles["modal-body-left"]} ref={viewportWrapperRef}>
                        <ImageWrapper
                            metadata={selected_image_metadata}
                            size="large"
                            imageId={selectedImageIndex}
                            className={styles['modal-selected-image']}
                            canvasDrawCallback={canvasDrawCallback}
                            maxWidth={maxWidthForSelectedImage}
                            maxHeight={maxHeightForSelectedImage}
                            useAllSpace={true}
                            allowZoomingInAndOut={true}
                        />
                        <RoundQuestionButton
                            className={styles['modal-question-button']}
                            tooltip_message={INSTRUCTIONS_TEXT}
                            data_tooltip_id={"high-res-image-modal-tooltip"}
                        />
                    </div>
                    <div className={styles["modal-body-right"]}>
                        {image_list}
                        <Tooltip id="high-res-image-modal-tooltip" positionStrategy="fixed" />
                    </div>
                </div>
            </div>
            <button className={styles["upper-right-corner-fixed-button"]} onClick={onClose}>Close</button>
        </div>
    );
}

export default HighResImageModal;