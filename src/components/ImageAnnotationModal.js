import React, { useState, useEffect, useRef } from "react";
import styles from "./ImageAnnotationModal.css";
import store from "../store";
import { drawPolygon } from "../drawing_utils";
import ImageWrapper from "./ImageWrapper";
import RoundQuestionButton from "./RoundQuestionButton";
import { Tooltip } from 'react-tooltip';

const labelNameSpanStyle = {
    'color': 'darkblue',
    'textDecoration': 'underline',
    'fontWeight': 'bold',
    'fontStyle': 'italic',
};
const color_blue = { 'color': 'blue', 'fontWeight': 'bold' };
const color_red = { 'color': 'red', 'fontWeight': 'bold' };

const INSTRUCTIONS_TEXT = `Use the controls at the bottom of the image to zoom in and out and to move the image around.

You can also zoom in and out with the mouse wheel or by pressing the + and - keys, and you can move the image around with the arrow keys.

You can also reset the image to its original size and position by pressing 0 or with the ⟳ button at the bottom of the image.`;

function getDeletePolygonButtonCallback(report_data, labelName, dicomId, index, force_update) {
    return () => {
        report_data.delete_polygon_for_gt_label(labelName, dicomId, index);
        force_update();
    };
}

function getDeletePolygonButtonCallback_CustomLabel(report_data, labelIndex, dicomId, index, force_update) {
    return () => {
        report_data.delete_polygon_for_custom_label(labelIndex, dicomId, index);
        force_update();
    };
}

function ImageAnnotationModal({ metadata, onClose }) {
    const report_data = store.get('report_data');

    const imageMetadata = metadata['image_metadata'];
    const labelIndex = metadata['label_index']; // used by custom labels the user is creating
    // If labelIndex is not undefined, then this is a custom label. Otherwise, it is a ground truth label.
    // Some logic will be different depending on whether this is a ground truth label or a custom label.
    const isGroundTruthLabel = labelIndex === undefined;

    let labelName;
    if (isGroundTruthLabel) {
        labelName = metadata['label_name'];
        // num_polygons = report_data.get_polygons_for_gt_label(labelName, imageMetadata['dicom_id']).length;
    } else {
        labelName = report_data.get_custom_label_name(labelIndex);
        // num_polygons = report_data.get_polygons_for_custom_label(labelIndex, imageMetadata['dicom_id']).length;
    }
    // console.log(`ImageAnnotationModal: labelName = ${labelName}, metadata = ${JSON.stringify(metadata)}`);

    if (imageMetadata['image_index'] === undefined) {
        throw new Error("ImageAnnotationModal: imageMetadata['image_index'] is undefined");
    }

    const [ selectedImageIndex, setSelectedImageIndex ] = useState(imageMetadata['image_index']);
    const [ maxWidthForSelectedImage, setMaxWidthForSelectedImage ] = useState(0);
    const [ maxHeightForSelectedImage, setMaxHeightForSelectedImage ] = useState(0);
    const [ forceUpdate, setForceUpdate ] = useState(false);
    const viewportWrapperRef = useRef(null);

    const force_update = () => {
        // console.log('Forcing update...');
        setForceUpdate(!forceUpdate);
    };

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

    const canvasDrawCallback = (canvas, temporary_polygon) => {
        // console.log(`From ImageAnnotationModal: canvasDrawCallback: dicomId = ${dicomId}, temporary_polygon = ${temporary_polygon}`);
        const canvas_width = canvas.width;
        const canvas_height = canvas.height;
        const context = canvas.getContext('2d');
        let polygons;
        if (isGroundTruthLabel) {
            polygons = report_data.get_polygons_for_gt_label(labelName, dicomId, canvas_width, canvas_height);
        } else {
            polygons = report_data.get_polygons_for_custom_label(labelIndex, dicomId, canvas_width, canvas_height);
        }
        // console.log(`From ImageAnnotationModal: canvasDrawCallback: dicomId = ${dicomId}, polygons.length = ${polygons.length}, temporary_polygon = ${temporary_polygon}`);
        context.clearRect(0, 0, canvas_width, canvas_height);
        for (let i = 0; i < polygons.length; i++) {
            const polygon = polygons[i];
            drawPolygon(context, polygon, 'red', true, i+1);
        }
        if (temporary_polygon && temporary_polygon.length > 0) {
            // temporary_polygon is in the range [0, 1] x [0, 1]
            // We need to scale it to the canvas size.
            temporary_polygon = temporary_polygon.map((point) => {
                return [point[0] * canvas_width, point[1] * canvas_height];
            });
            drawPolygon(context, temporary_polygon, 'blue', false);
        }
    };

    const onPolygonCreated = (polygon) => {
        // console.log(`From ImageAnnotationModal: onPolygonCreated: polygon = ${polygon}`);
        if (isGroundTruthLabel) {
            report_data.add_polygon_for_gt_label(labelName, dicomId, polygon);
        } else {
            report_data.add_polygon_for_custom_label(labelIndex, dicomId, polygon);
        }
        force_update();
    };

    const onLastPolygonDeleted = () => {
        let last_polygon;
        if (isGroundTruthLabel) {
            last_polygon = report_data.pop_last_polygon_for_gt_label(labelName, dicomId);
        } else {
            last_polygon = report_data.pop_last_polygon_for_custom_label(labelIndex, dicomId);
        }
        if (last_polygon) force_update();
        return last_polygon;
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

    // determine the number of polygons for the label
    let num_polygons;
    const selected_dicom_id = report_data.get_dicom_id(selectedImageIndex);
    if (isGroundTruthLabel) {
        num_polygons = report_data.get_polygons_for_gt_label(labelName, selected_dicom_id).length;
    } else {
        labelName = report_data.get_custom_label_name(labelIndex);
        num_polygons = report_data.get_polygons_for_custom_label(labelIndex, selected_dicom_id).length;
    }
    // list of delete polygon buttons
    let deletePolygonButtons = [];
    for (let i = 0; i < num_polygons; i++) {
        let callback;
        if (isGroundTruthLabel) {
            callback = getDeletePolygonButtonCallback(
                report_data, labelName, dicomId, i, force_update);
        } else {
            callback = getDeletePolygonButtonCallback_CustomLabel(
                report_data, labelIndex, dicomId, i, force_update);
        }
        deletePolygonButtons.push(
            <button key={i} onClick={callback}>Delete Polygon {i+1}</button>
        );
    }

    let labelNameToShow = labelName;
    if (labelNameToShow === '') {
        labelNameToShow = '<unknown_label>';
    }

    return (
        <div className={styles["modal-overlay"]}>
            <div className={styles["modal-content"]}>
                <div className={styles["modal-header"]}> {header_text} </div>
                <div className={styles["modal-body"]}>
                    <div className={styles["modal-body-left"]}>
                        <h3>Finding visual evidence for <span style={labelNameSpanStyle}>{labelNameToShow}</span> label</h3>
                        <h3>Instructions</h3>
                        Click to add points and draw polygons around areas in the image where the label <span style={labelNameSpanStyle}>{labelNameToShow}</span> can
                        be seen. While editing the current polygon (<span style={color_blue}>color blue</span>), you can drag around the
                        last point added. You can also use Ctrl-Z to undo the last point, or Esc to fully clear the current polygon.
                        If you close the blue polygon, it will be added to the list of polygons (<span style={color_red}>color red</span>).
                        <h3>Number of polygons: {num_polygons}</h3>
                        {deletePolygonButtons}
                    </div>
                    <div className={styles["modal-body-center"]} ref={viewportWrapperRef}>
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
                            allowDrawingPolygons={true}
                            drawingForGroundTruthLabel={isGroundTruthLabel}
                            onPolygonCreated={onPolygonCreated}
                            onLastPolygonDeleted={onLastPolygonDeleted}
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

export default ImageAnnotationModal;