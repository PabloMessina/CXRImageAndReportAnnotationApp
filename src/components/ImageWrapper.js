import React, { useState, useEffect, useRef } from 'react';
import { getImageUrl } from '../utils';
import { APP_EVENTS, subscribe_to_event, unsubscribe_from_event } from '../app_events';
import styles from './ImageWrapper.css';
import { euclideanDistance } from '../drawing_utils';

const MAX_ZOOM = 30;
const MIN_ZOOM = 1;
const TRANSLATION_STEP = 13;
const MIN_DISTANCE_BETWEEN_POINTS = 5;

function _get_transform_string(scale, translation) {
    return `translate(-50%, -50%) scale(${scale}) translate(${translation.x}px, ${translation.y}px)`;
}

function ImageWrapper({ maxWidth, maxHeight, useAllSpace, metadata, size, imageId, expandCallback, className,
        canvasDrawCallback, allowZoomingInAndOut, allowDrawingPolygons, onPolygonCreated, forceUpdate }) {

    // console.log(`ImageWrapper: imageId: ${imageId}, size: ${size}, metadata: ${JSON.stringify(metadata)}, maxWidth: ${maxWidth}, maxHeight: ${maxHeight}, useAllSpace: ${useAllSpace}, className: ${className}`);
    // console.log(`ImageWrapper: forceUpdate: ${forceUpdate}`);

    const { part_id, subject_id, study_id, dicom_id, original_width, original_height } = metadata;
    const imageUrl = getImageUrl(size, part_id, subject_id, study_id, dicom_id);
    const viewportRef = useRef(null);
    const imageRef = useRef(null);
    const canvasRef = useRef(null);
    const currentPolygonRef = useRef([]);
    const use_canvas = canvasDrawCallback !== undefined;
    
    let canvas_component = null;
    let onLoadCallback = null;
    let image_style = null;

    if (use_canvas) {
        canvas_component = <canvas ref={canvasRef} className={styles.canvas} />;
        useEffect(() => {
            const callback = () => canvasDrawCallback(canvasRef.current);
            canvasDrawCallback(canvasRef.current);
            subscribe_to_event(APP_EVENTS.POLYGONS_UPDATED, callback);
            return () => unsubscribe_from_event(APP_EVENTS.POLYGONS_UPDATED, callback);
        }, [canvasDrawCallback, imageId]);
    }

    useEffect(() => {
        // console.log('ImageWrapper: useEffect: forceUpdate: ', forceUpdate);
        if (canvasRef.current) canvasDrawCallback(canvasRef.current);
    }, [forceUpdate]);

    useEffect(() => {
        const aspect_ratio = original_width / original_height;
        let image_height = maxHeight;
        let image_width = image_height * aspect_ratio;
        if (image_width > maxWidth) {
            image_width = maxWidth;
            image_height = image_width / aspect_ratio;
        }
        if (useAllSpace) {
            viewportRef.current.style.setProperty('width', `${maxWidth}px`);
            viewportRef.current.style.setProperty('height', `${maxHeight}px`);
        } else {
            viewportRef.current.style.setProperty('width', `${image_width}px`);
            viewportRef.current.style.setProperty('height', `${image_height}px`);
        }
        imageRef.current.style.setProperty('width', `${image_width}px`);
        imageRef.current.style.setProperty('height', `${image_height}px`);
        if (use_canvas) {
            canvasRef.current.width = image_width;
            canvasRef.current.height = image_height;
            canvasDrawCallback(canvasRef.current);
        }
    }, [maxWidth, maxHeight, useAllSpace, canvasDrawCallback, imageId]);

    let zoomInButton = null;
    let zoomOutButton = null;
    let resetZoomButton = null;
    let translationArrowButtons = null;
    let handleMouseMoveOverImage = null;

    if (allowZoomingInAndOut) {
        const scaleRef = useRef(1);
        const translationRef = useRef({ x: 0, y: 0 });
        const mousePositionRef = useRef(null);
        const zoomIntervalRef = useRef(null);
        const translateIntervalRef = useRef(null);
        image_style = {
            transform: _get_transform_string(scaleRef.current, translationRef.current)
        };
        // console.log('image_style: ', image_style);
        const applyZoom = (factor, towards_mouse=false) => {
            if (factor > 1 && scaleRef.current === MAX_ZOOM) return; // don't zoom in if we are already at max zoom
            if (factor < 1 && scaleRef.current === MIN_ZOOM) return; // don't zoom out if we are already at min zoom
            let new_scale = scaleRef.current * factor;
            if (new_scale > MAX_ZOOM) new_scale = MAX_ZOOM; // max zoom
            if (new_scale < MIN_ZOOM) new_scale = MIN_ZOOM; // min zoom
            
            if (towards_mouse) { // zoom towards the mouse position
                // if mouse is not over the image, truncate the mouse position to the image
                let mouse_client_x = mousePositionRef.current.clientX;
                let mouse_client_y = mousePositionRef.current.clientY;
                const image_rect = imageRef.current.getBoundingClientRect();
                if (mouse_client_x < image_rect.left) mouse_client_x = image_rect.left;
                if (mouse_client_x > image_rect.right) mouse_client_x = image_rect.right;
                if (mouse_client_y < image_rect.top) mouse_client_y = image_rect.top;
                if (mouse_client_y > image_rect.bottom) mouse_client_y = image_rect.bottom;

                // 1) Find the coordinates the current mouse position would have relative to the image
                //    if the image was zoomed in by the new scale factor but not translated

                // find the mouse position relative to the center of the viewport
                const viewport_rect = viewportRef.current.getBoundingClientRect();
                const mouse_x__rel2vpc = mouse_client_x - (viewport_rect.left + viewport_rect.width/2);
                const mouse_y__rel2vpc = mouse_client_y - (viewport_rect.top + viewport_rect.height/2);

                // find the mouse position relative to image scaled by the new scale factor but not translated
                const mouse_x__rel2newimg = mouse_x__rel2vpc + imageRef.current.width * new_scale/2;
                const mouse_y__rel2newimg = mouse_y__rel2vpc + imageRef.current.height * new_scale/2;

                // 2) Find the coordinates the position pointed to by the mouse would have relative to the image
                //    if the image was zoomed in by the new scale factor but not translated

                // normalize current mouse position relative to the current image
                const mouse_x__rel2curimg_norm = (mouse_client_x - image_rect.left) / image_rect.width;
                const mouse_y__rel2curimg_norm = (mouse_client_y - image_rect.top) / image_rect.height;

                // find the coordinates of this position relative to the image scaled by the new scale factor, not translated
                // and without the normalization
                const pointed_x__rel2newimg = mouse_x__rel2curimg_norm * imageRef.current.width * new_scale;
                const pointed_y__rel2newimg = mouse_y__rel2curimg_norm * imageRef.current.height * new_scale;

                // 3) Find the translation that would be needed to move the image so that the position currently pointed to by the mouse
                //    would be under the cursor after the image is zoomed in by the new scale factor
                const new_translation_x = mouse_x__rel2newimg - pointed_x__rel2newimg;
                const new_translation_y = mouse_y__rel2newimg - pointed_y__rel2newimg;
                translationRef.current.x = new_translation_x / new_scale; // normalization required due to how CSS transforms work
                translationRef.current.y = new_translation_y / new_scale; // normalization required due to how CSS transforms work
            }
            scaleRef.current = new_scale;
            imageRef.current.style.transform = _get_transform_string(scaleRef.current, translationRef.current);
            if (canvasRef.current) {
                canvasRef.current.style.transform = imageRef.current.style.transform; // apply the same transform to the canvas
            }
        };
        const applyTranslation = (dx, dy) => {
            const image_rect = imageRef.current.getBoundingClientRect();
            const viewport_rect = viewportRef.current.getBoundingClientRect();
            const x_max_overflow_before = Math.max(
                Math.max(image_rect.left - viewport_rect.left, 0),
                Math.max(viewport_rect.right - image_rect.right, 0)
            );
            const x_max_overflow_after = Math.max(
                Math.max((image_rect.left + dx) - viewport_rect.left, 0),
                Math.max(viewport_rect.right - (image_rect.right + dx), 0)
            );
            const y_max_overflow_before = Math.max(
                Math.max(image_rect.top - viewport_rect.top, 0),
                Math.max(viewport_rect.bottom - image_rect.bottom, 0)
            );
            const y_max_overflow_after = Math.max(
                Math.max((image_rect.top + dy) - viewport_rect.top, 0),
                Math.max(viewport_rect.bottom - (image_rect.bottom + dy), 0)
            );
            if (x_max_overflow_before < x_max_overflow_after) dx = 0; // don't translate if the overflow is increasing
            if (y_max_overflow_before < y_max_overflow_after) dy = 0; // don't translate if the overflow is increasing
            if (dx === 0 && dy === 0) return; // no need to translate
            translationRef.current.x += dx;
            translationRef.current.y += dy;
            imageRef.current.style.transform = _get_transform_string(scaleRef.current, translationRef.current);
            if (canvasRef.current) {
                canvasRef.current.style.transform = imageRef.current.style.transform; // apply the same transform to the canvas
            }
        };
        const handleZoomInMouseDown = (event) => {
            if (event.button !== 0) return;
            clearInterval(zoomIntervalRef.current); // just in case
            applyZoom(1.1);
            zoomIntervalRef.current = setInterval(() => applyZoom(1.1), 50);
        };
        const handleZoomInMouseUp = () => {
            clearInterval(zoomIntervalRef.current);
        };
        const handleZoomOutMouseDown = (event) => {
            if (event.button !== 0) return;
            clearInterval(zoomIntervalRef.current); // just in case
            applyZoom(1/1.1);
            zoomIntervalRef.current = setInterval(() => applyZoom(1/1.1), 50);
        };
        const handleZoomOutMouseUp = () => {
            clearInterval(zoomIntervalRef.current);
        };
        // we need to detect if the mouse leaves a button
        const handleZoomMouseLeave = () => {
            clearInterval(zoomIntervalRef.current);
        };
        const handleTranslateMouseLeave = () => {
            clearInterval(translateIntervalRef.current);
        };

        const getHandleTranslateMouseDown = (x, y) => {
            return (event) => {
                if (event.button !== 0) return;
                clearInterval(translateIntervalRef.current);
                applyTranslation(x, y);
                translateIntervalRef.current = setInterval(() => applyTranslation(x, y), 50);
            };
        };
        const handleTranslateMouseUp = () => {
            clearInterval(translateIntervalRef.current);
        };

        handleMouseMoveOverImage = (event) => {
            mousePositionRef.current = {
                clientX: event.clientX,
                clientY: event.clientY,
            };
        };

        const handleResetZoom = () => {
            scaleRef.current = 1;
            translationRef.current = {x: 0, y: 0};
            imageRef.current.style.transform = _get_transform_string(scaleRef.current, translationRef.current);
            if (canvasRef.current) {
                canvasRef.current.style.transform = imageRef.current.style.transform; // apply the same transform to the canvas
            }
        };

        const handleKeyDown = (event) => {
            // + or = to zoom in
            if (event.key === '+' || event.key === '=') {
                applyZoom(1.5, true);
            }
            // - to zoom out
            if (event.key === '-') {
                applyZoom(1/1.5, true);
            }
            // 0 to reset zoom
            if (event.key === '0') {
                handleResetZoom();
            }
            // arrow keys to translate
            if (event.key === 'ArrowUp') {
                applyTranslation(0, TRANSLATION_STEP);
            }
            if (event.key === 'ArrowDown') {
                applyTranslation(0, -TRANSLATION_STEP);
            }
            if (event.key === 'ArrowLeft') {
                applyTranslation(TRANSLATION_STEP, 0);
            }
            if (event.key === 'ArrowRight') {
                applyTranslation(-TRANSLATION_STEP, 0);
            }
        };

        zoomInButton = <button onMouseDown={handleZoomInMouseDown} onMouseUp={handleZoomInMouseUp}
            onMouseLeave={handleZoomMouseLeave}
            className={`${styles['zoom-in-button']} ${styles['zoom-button']}`}
            >+</button>;
        zoomOutButton = <button onMouseDown={handleZoomOutMouseDown} onMouseUp={handleZoomOutMouseUp}
            onMouseLeave={handleZoomMouseLeave}
            className={`${styles['zoom-out-button']} ${styles['zoom-button']}`}
            >-</button>;
        resetZoomButton = <button onClick={handleResetZoom}
            className={`${styles['reset-zoom-button']} ${styles['zoom-button']}`}
            >⟳</button>;
        translationArrowButtons = (
            <div className={styles['translation-arrow-buttons-container']}>
                <div className={styles['translation-arrow-buttons-middle']}>
                    <button onMouseDown={getHandleTranslateMouseDown(0, -TRANSLATION_STEP)} onMouseUp={handleTranslateMouseUp}
                        onMouseLeave={handleTranslateMouseLeave}
                        className={`${styles['translation-arrow-button']} ${styles['translation-arrow-button-up']}`}/>
                    <button onMouseDown={getHandleTranslateMouseDown(TRANSLATION_STEP, 0)} onMouseUp={handleTranslateMouseUp}
                        onMouseLeave={handleTranslateMouseLeave}
                        className={`${styles['translation-arrow-button']} ${styles['translation-arrow-button-right']}`} />
                    <button onMouseDown={getHandleTranslateMouseDown(0, TRANSLATION_STEP)} onMouseUp={handleTranslateMouseUp}
                        onMouseLeave={handleTranslateMouseLeave}
                        className={`${styles['translation-arrow-button']} ${styles['translation-arrow-button-down']}`} />
                    <button onMouseDown={getHandleTranslateMouseDown(-TRANSLATION_STEP, 0)} onMouseUp={handleTranslateMouseUp}
                        onMouseLeave={handleTranslateMouseLeave}
                        className={`${styles['translation-arrow-button']} ${styles['translation-arrow-button-left']}`} />
                </div>
            </div>
        )
        
        useEffect(() => {
            const handleWheel = (event) => {
                // console.log('wheel event: ', event);
                if (!imageRef.current) return;
                if (event.deltaY < 0) applyZoom(1.05, true);
                if (event.deltaY > 0) applyZoom(1/1.05, true);
            };
            viewportRef.current.addEventListener('wheel', handleWheel, {passive: true});
            // add event listener for keydown
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                if (viewportRef.current) viewportRef.current.removeEventListener('wheel', handleWheel);
                document.removeEventListener('keydown', handleKeyDown);
            };
        }, []);
    }

    if (allowDrawingPolygons) {
        if (onPolygonCreated === undefined) {
            throw new Error('onPolygonCreated must be defined if allowDrawingPolygons is true');
        }
        if (canvasDrawCallback === undefined) {
            throw new Error('canvasDrawCallback must be defined if allowDrawingPolygons is true');
        }
        useEffect(() => {
            const canvas = canvasRef.current;
            
            const handleMouseDown = event => {
                // console.log(`handleMouseDown, event: ${event}`);
                const { offsetX, offsetY } = event;
                // normalize between 0 and 1
                const newX = offsetX / canvas.width;
                const newY = offsetY / canvas.height;
                if (currentPolygonRef.current.length > 0) {
                    if (currentPolygonRef.current.length > 3) { // polygon must have at least 3 points
                        // compute distance from first point to last point
                        const [firstX, firstY] = currentPolygonRef.current[0];
                        const dist_from_first = euclideanDistance(firstX, firstY, newX, newY, original_width, original_height);
                        if (dist_from_first < MIN_DISTANCE_BETWEEN_POINTS * 2) { // if close enough, then close the polygon
                            const currentPolygon = currentPolygonRef.current.slice();
                            currentPolygon.pop(); // remove last point, which is (approximately) the same as first point
                            // notify parent component that a polygon has been created
                            onPolygonCreated(currentPolygon);
                            // reset current polygon
                            currentPolygonRef.current = [];
                            return;
                        }
                    }
                    // check if new point is too close to any existing point
                    let too_close = false;
                    for (let i = 0; i < currentPolygonRef.current.length-1; i++) {
                        const [x, y] = currentPolygonRef.current[i];
                        const dist = euclideanDistance(x, y, newX, newY, original_width, original_height);
                        if (dist < MIN_DISTANCE_BETWEEN_POINTS) {
                            too_close = true;
                            break;
                        }
                    }
                    if (too_close) return;
                    // remove draggable point
                    currentPolygonRef.current.pop();
                    // add point to current polygon twice
                    currentPolygonRef.current.push([newX, newY]);
                    currentPolygonRef.current.push([newX, newY]); // the second point will be dragged around on mousemove
                    // re-draw scene with new point
                    canvasDrawCallback(canvas, currentPolygonRef.current);
                    return;
                }
                // add point to current polygon twice
                currentPolygonRef.current.push([newX, newY]);
                currentPolygonRef.current.push([newX, newY]); // the second point will be dragged around on mousemove
                // re-draw image with new point
                canvasDrawCallback(canvas, currentPolygonRef.current);
            };

            const handleMouseMove = event => {
                // console.log('handleMouseMove');
                if (currentPolygonRef.current.length === 0) return;
                const { offsetX, offsetY } = event;
                const newX = offsetX / canvas.width;
                const newY = offsetY / canvas.height;
                // update last point in current polygon
                currentPolygonRef.current[currentPolygonRef.current.length-1] = [newX, newY];
                // re-draw scene with new point
                canvasDrawCallback(canvas, currentPolygonRef.current);
            };

            const handleKeyDown = event => {
                if (event.ctrlKey && event.key === 'z') {
                    // event.preventDefault();
                    if (currentPolygonRef.current.length > 2) {
                        const lastPoint = currentPolygonRef.current.pop();
                        const secondLastPoint = currentPolygonRef.current.pop();
                        if (euclideanDistance(lastPoint[0], lastPoint[1], secondLastPoint[0], secondLastPoint[1],
                                original_width, original_height) < MIN_DISTANCE_BETWEEN_POINTS) {
                            // if last point is close enough to second last point, then remove the third last point
                            currentPolygonRef.current.pop();
                        }
                        currentPolygonRef.current.push(lastPoint); // put the last point back in because
                        // it's the one that's being dragged around on mousemove
                    } else {
                        // empty current polygon
                        currentPolygonRef.current = [];
                    }
                    // re-draw scene with new point
                    canvasDrawCallback(canvas, currentPolygonRef.current);
                } else if (event.key === 'Escape') {
                    // empty current polygon
                    currentPolygonRef.current = [];
                    // re-draw scene with new point
                    canvasDrawCallback(canvas, currentPolygonRef.current);
                }
            };
        
            canvas.addEventListener('mousedown', handleMouseDown);
            canvas.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('keydown', handleKeyDown);

            return () => {
                canvas.removeEventListener('mousedown', handleMouseDown);
                canvas.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('keydown', handleKeyDown);
            };
        }, [canvasDrawCallback]);
    }
            

    let expand_button = null;
    let handleMouseEnter = null;
    let handleMouseLeave = null;
    if (expandCallback !== undefined) {
        const [isHovered, setIsHovered] = useState(false);
        handleMouseEnter = () => { setIsHovered(true); };
        handleMouseLeave = () => { setIsHovered(false); };
        if (isHovered) {
            expand_button = <button className={styles['expand-button']} onClick={expandCallback}>Expand</button>;
        }
    }
        
    return (
        <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMoveOverImage}
            ref={viewportRef}
            className={`${className} ${styles['image-wrapper']}`}
        >
            <img
                src={imageUrl} style={image_style} ref={imageRef} onLoad={onLoadCallback}
                className={styles['image']}
            />
            {expand_button}
            {canvas_component}
            {zoomInButton}
            {zoomOutButton}
            {resetZoomButton}
            {translationArrowButtons}
        </div>
    );
}

export default ImageWrapper;