import React, { useRef, useState, useEffect } from "react";
import ImageWrapper from "./ImageWrapper";
import store from "../store";
import styles from "./ImagesDisplayer.css";
import { drawMultiplePolygons } from "../drawing_utils";
import { APP_EVENTS, subscribe_to_event, unsubscribe_from_event } from '../app_events';
import { useForceUpdate } from '../utils';

function ImagesDisplayer({expandCallback}) {

    // console.log('ImagesDisplayer: render');

    const [ selectedImageIndex, setSelectedImageIndex ] = useState(0);
    const [ maxWidthForSelectedImage, setMaxWidthForSelectedImage ] = useState(0);
    const [ maxHeightForSelectedImage, setMaxHeightForSelectedImage ] = useState(0);

    const forceUpdate = useForceUpdate();

    const displayerRef = useRef(null);

    const getImageSelectedCallback = (index) => { return () => setSelectedImageIndex(index) };

    const report_data = store.get('report_data');
    const dicom_id_view_pos_pairs = report_data.get_dicom_id_view_pos_pairs();

    let selected_image = null;
    let selected_view_pos = null;
    let selected_dicom_id = null;
    let image_list = null;
    let title = 'No images to display';

    const getCanvasDrawCallback = (index) => {
        return (canvas) => {            
            const canvas_width = canvas.width;
            const canvas_height = canvas.height;
            const context = canvas.getContext('2d');
            const dicom_id = dicom_id_view_pos_pairs[index][0];
            const [polygons, label_names] = report_data.get_all_polygons_for_dicom_id(
                dicom_id, canvas_width, canvas_height, true);
            context.clearRect(0, 0, canvas_width, canvas_height);
            drawMultiplePolygons(context, polygons, label_names);
            // console.log(`getCanvasDrawCallback(${index}), label_names: ${label_names}`);
        };
    };

    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            const h = displayerRef.current.parentNode.clientHeight;
            const w = displayerRef.current.parentNode.clientWidth;
            setMaxWidthForSelectedImage(w);
            setMaxHeightForSelectedImage(h - 230);
        });
        if (displayerRef.current) {
            resizeObserver.observe(displayerRef.current.parentNode);
            subscribe_to_event(APP_EVENTS.CUSTOM_LABEL_NAME_CHANGED, forceUpdate);
        }
        return () => {
            if (displayerRef.current) {
                resizeObserver.unobserve(displayerRef.current.parentNode);
            }
            unsubscribe_from_event(APP_EVENTS.CUSTOM_LABEL_NAME_CHANGED, forceUpdate);
        };
    }, []);
    
    if (dicom_id_view_pos_pairs !== undefined) {
        // console.log(`ImagesDisplayer: about to render selected_image = <ImageWrapper> for index ${selectedImageIndex}`);
        title = `Images (${dicom_id_view_pos_pairs.length})`
        // selected image
        const image_metadata = report_data.get_image_metadata(selectedImageIndex);
        selected_image = <ImageWrapper metadata={image_metadata} size="medium"
            expandCallback={() => expandCallback(selectedImageIndex)}
            canvasDrawCallback={getCanvasDrawCallback(selectedImageIndex)}
            className={styles['selected-image']}
            maxWidth={maxWidthForSelectedImage}
            maxHeight={maxHeightForSelectedImage}
            forceUpdate={forceUpdate}
            />;
        selected_view_pos = image_metadata.view_pos;
        selected_dicom_id = image_metadata.dicom_id;
        // list of images (thumbnails)
        image_list = [];
        for (let i = 0; i < dicom_id_view_pos_pairs.length; i++) {
            const [dicomId, viewPos] = dicom_id_view_pos_pairs[i];
            const image_metadata = report_data.get_image_metadata(i);
            const class_name = (i === selectedImageIndex) ? styles['image-list-item-selected'] : styles['image-list-item'];
            image_list.push(
                <div key={dicomId} onClick={getImageSelectedCallback(i)} className={class_name}>
                    <ImageWrapper maxWidth={100} maxHeight={100} useAllSpace={true}
                                  metadata={image_metadata} size="small" />
                    <span className={styles['image-list-item-span']}>{(i+1)}) {viewPos}</span>
                </div>
            );
        }
    }

    return (<div className={styles['images-displayer']} ref={displayerRef}>
        <div className={styles['title']}>{title}</div>
        <div className={styles['selected-image-div']}>
            {selected_view_pos !== null &&
            <span className={styles['selected-image-div-span']}>{selected_view_pos}, dicom id: {selected_dicom_id}</span>}
            {selected_image}
        </div>
        <div className={styles['image-list-div']}>
            {image_list}
        </div>
    </div>);
}

export default ImagesDisplayer;