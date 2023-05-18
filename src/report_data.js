import { cloneDeep } from "lodash";

function get_current_timestamp() {
    return new Date().getTime();
}

class ReportData {
    constructor(metadata={}, annotations={}) {
        this._metadata = metadata;
        this._annotations = cloneDeep(annotations);
        this._last_edit_timestamp = get_current_timestamp();
    }
    
    get_last_edit_timestamp() {
        return this._last_edit_timestamp;
    }
    
    // Getters and setters for metadata
    get_metadata() {
        return this._metadata;
    }
    set_metadata(metadata) {
        this._metadata = metadata;
        this._last_edit_timestamp = get_current_timestamp();
    }
    get_report_filepath() {
        return this._metadata["report_filepath"];
    }
    get_original_report() {
        return this._metadata["original_report"];
    }
    get_part_id() {
        return this._metadata["part_id"];
    }
    get_subject_id() {
        return this._metadata["subject_id"];
    }
    get_study_id() {
        return this._metadata["study_id"];
    }
    get_dicom_id_view_pos_pairs() {
        return this._metadata["dicom_id_view_pos_pairs"];
    }
    get_dicom_id(index) {
        if (!this._metadata.hasOwnProperty("dicom_id_view_pos_pairs") ||
            index < 0 || index >= this._metadata["dicom_id_view_pos_pairs"].length) {
            return undefined;
        }
        return this._metadata["dicom_id_view_pos_pairs"][index][0];
    }
    get_label_data(labeler_name) {
        return this._metadata[labeler_name];
    }

    // Getters and setters for annotations
    get_report_accuracy() {
        return this._annotations["report_accuracy"];
    }
    set_report_accuracy(report_accuracy) {
        this._annotations["report_accuracy"] = report_accuracy;
        this._last_edit_timestamp = get_current_timestamp();
    }
    get_report_completeness() {
        return this._annotations["report_completeness"];
    }
    set_report_completeness(report_completeness) {
        this._annotations["report_completeness"] = report_completeness;
        this._last_edit_timestamp = get_current_timestamp();
    }
    get_agreement_for_gt_label(label_name) {
        if (!this._annotations.hasOwnProperty("agreement_for_gt_label") ||
            !this._annotations["agreement_for_gt_label"].hasOwnProperty(label_name)) {
            return undefined;
        }
        return this._annotations["agreement_for_gt_label"][label_name];
    }
    set_agreement_for_gt_label(label_name, agreement) {
        if (!this._annotations.hasOwnProperty("agreement_for_gt_label")) {
            this._annotations["agreement_for_gt_label"] = {};
        }
        this._annotations["agreement_for_gt_label"][label_name] = agreement;
        this._last_edit_timestamp = get_current_timestamp();
    }
    get_has_grounding_for_gt_label(label_name, dicom_id) {
        if (!this._annotations.hasOwnProperty("has_grounding_for_gt_label") ||
            !this._annotations["has_grounding_for_gt_label"].hasOwnProperty(label_name) ||
            !this._annotations["has_grounding_for_gt_label"][label_name].hasOwnProperty(dicom_id)) {
            return undefined;
        }
        return this._annotations["has_grounding_for_gt_label"][label_name][dicom_id];
    }
    set_has_grounding_for_gt_label(label_name, dicom_id, has_grounding) {
        if (!this._annotations.hasOwnProperty("has_grounding_for_gt_label")) {
            this._annotations["has_grounding_for_gt_label"] = {};
        }
        if (!this._annotations["has_grounding_for_gt_label"].hasOwnProperty(label_name)) {
            this._annotations["has_grounding_for_gt_label"][label_name] = {};
        }
        this._annotations["has_grounding_for_gt_label"][label_name][dicom_id] = has_grounding;
        this._last_edit_timestamp = get_current_timestamp();
    }
    get_label_source_for_gt_label(label_name) {
        if (!this._annotations.hasOwnProperty("label_source_for_gt_label") ||
            !this._annotations["label_source_for_gt_label"].hasOwnProperty(label_name)) {
            return undefined;
        }
        return this._annotations["label_source_for_gt_label"][label_name];
    }
    set_label_source_for_gt_label(label_name, label_source) {
        if (!this._annotations.hasOwnProperty("label_source_for_gt_label")) {
            this._annotations["label_source_for_gt_label"] = {};
        }
        this._annotations["label_source_for_gt_label"][label_name] = label_source;
        this._last_edit_timestamp = get_current_timestamp();
    }
    get_polygons_for_gt_label(label_name, dicom_id) {
        if (!this._annotations.hasOwnProperty("polygons_for_gt_label") ||
            !this._annotations["polygons_for_gt_label"].hasOwnProperty(label_name) ||
            !this._annotations["polygons_for_gt_label"][label_name].hasOwnProperty(dicom_id)) {
            return [];
        }
        return this._annotations["polygons_for_gt_label"][label_name][dicom_id];
    }
    add_polygon_for_gt_label(label_name, dicom_id, polygon) {
        if (!this._annotations.hasOwnProperty("polygons_for_gt_label")) {
            this._annotations["polygons_for_gt_label"] = {};
        }
        if (!this._annotations["polygons_for_gt_label"].hasOwnProperty(label_name)) {
            this._annotations["polygons_for_gt_label"][label_name] = {};
        }
        if (!this._annotations["polygons_for_gt_label"][label_name].hasOwnProperty(dicom_id)) {
            this._annotations["polygons_for_gt_label"][label_name][dicom_id] = [];
        }
        this._annotations["polygons_for_gt_label"][label_name][dicom_id].push(polygon);
        this._last_edit_timestamp = get_current_timestamp();
    }
    delete_polygon_for_gt_label(label_name, dicom_id, polygon_index) {
        if (!this._annotations.hasOwnProperty("polygons_for_gt_label") ||
            !this._annotations["polygons_for_gt_label"].hasOwnProperty(label_name) ||
            !this._annotations["polygons_for_gt_label"][label_name].hasOwnProperty(dicom_id) ||
            polygon_index < 0 || polygon_index >= this._annotations["polygons_for_gt_label"][label_name][dicom_id].length) {
            return;
        }
        this._annotations["polygons_for_gt_label"][label_name][dicom_id].splice(polygon_index, 1);
        this._last_edit_timestamp = get_current_timestamp();
    }
}

export default ReportData;