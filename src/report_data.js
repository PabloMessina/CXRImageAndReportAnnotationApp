import { cloneDeep } from "lodash";
import { APP_EVENTS, emit_event } from "./app_events";

let CUSTOM_LABEL_ID = 0;

const LABEL_CATEGORIES = ['chexpert_labels', 'chest_imagenome_labels', 'common_labels'];

const CHEXPERT_LABEL_NAMES = [
    'Enlarged Cardiomediastinum',
    'Cardiomegaly',
    'Lung Lesion',
    'Lung Opacity',
    'Edema',
    'Consolidation',
    'Pneumonia',
    'Atelectasis',
    'Pneumothorax',
    'Pleural Effusion',
    'Pleural Other',
    'Fracture',
    'Support Devices',
]

const CXR14_LABEL_NAMES = [
    'Atelectasis',
    'Cardiomegaly',
    'Consolidation',
    'Edema',
    'Effusion',
    'Emphysema',
    'Fibrosis',
    'Hernia',
    'Infiltration',
    'Mass',
    'Nodule',
    'Pleural Thickening',
    'Pneumonia',
    'Pneumothorax',
]

const VINBIG_LABEL_NAMES = [
    'Aortic enlargement', 'Atelectasis', 'Calcification',
    'Cardiomegaly', 'Clavicle fracture', 'Consolidation', 'Edema',
    'Emphysema', 'Enlarged PA', 'ILD', 'Infiltration', 'Lung Opacity',
    'Lung cavity', 'Lung cyst', 'Mediastinal shift', 'Nodule/Mass',
    'Pleural effusion', 'Pleural thickening', 'Pneumothorax',
    'Pulmonary fibrosis', 'Rib fracture', 'Other lesion', 'COPD',
    'Lung tumor', 'Pneumonia', 'Tuberculosis', 'Other disease'
]

const CHEST_IMAGENOME_LABEL_NAMES = [
    'abnormal',
    'airspace opacity',
    'alveolar',
    'alveolar hemorrhage',
    'aortic graft/repair',
    'artifact',
    'aspiration',
    'atelectasis',
    'bone lesion',
    'breast/nipple shadows',
    'bronchiectasis',
    'cabg grafts',
    'calcified',
    'calcified nodule',
    'cardiac pacer and wires',
    'chest port',
    'chest tube',
    'clavicle fracture',
    'consolidation',
    'copd/emphysema',
    'costophrenic angle blunting',
    'cyst/bullae',
    'diaphragmatic eventration (benign)',
    'elevated hemidiaphragm',
    'endotracheal tube',
    'enlarged cardiac silhouette',
    'enlarged hilum',
    'enteric tube',
    'fluid overload/heart failure',
    'goiter',
    'granulomatous disease',
    'hernia',
    'hydropneumothorax',
    'hyperaeration',
    'ij line',
    'increased reticular markings/ild pattern',
    'infiltration',
    'interstitial',
    'interstitial lung disease',
    'intra-aortic balloon pump',
    'linear/patchy atelectasis',
    'lobar/segmental collapse',
    'low lung volumes',
    'lung cancer',
    'lung lesion',
    'lung opacity',
    'mass/nodule (not otherwise specified)',
    'mediastinal displacement',
    'mediastinal drain',
    'mediastinal widening',
    'multiple masses/nodules',
    'opacity',
    'pericardial effusion',
    'picc',
    'pigtail catheter',
    'pleural effusion',
    'pleural/parenchymal scarring',
    'pneumomediastinum',
    'pneumonia',
    'pneumothorax',
    'prosthetic valve',
    'pulmonary edema/hazy opacity',
    'rib fracture',
    'rotated',
    'scoliosis',
    'shoulder osteoarthritis',
    'skin fold',
    'spinal degenerative changes',
    'spinal fracture',
    'sub-diaphragmatic air',
    'subclavian line',
    'subcutaneous air',
    'superior mediastinal mass/enlargement',
    'swan-ganz catheter',
    'tortuous aorta',
    'tracheostomy tube',
    'vascular calcification',
    'vascular congestion',
    'vascular redistribution',
]

const aux = new Set();
aux.add("other abnormality");
[...CHEST_IMAGENOME_LABEL_NAMES, ...CHEXPERT_LABEL_NAMES,
    ...CXR14_LABEL_NAMES, ...VINBIG_LABEL_NAMES].forEach((label) => {
    aux.add(label.toLowerCase());
});
const MERGED_LABEL_NAMES = [...aux];
MERGED_LABEL_NAMES.sort();
// console.log(MERGED_LABEL_NAMES);

function is_value_empty(value) {
    if (value === undefined || value === null || value === '') return true;
    if (typeof value === 'string' && value.trim() === '') return true;
}

class UnionFind { // Disjoint-set data structure
    constructor(size) {
        this._parent = new Array(size);
        this._rank = new Array(size);
        for (let i = 0; i < size; i++) {
            this._parent[i] = i;
            this._rank[i] = 0;
        }
    }
    find(x) {
        if (this._parent[x] !== x) {
            this._parent[x] = this.find(this._parent[x]);
        }
        return this._parent[x];
    }
    union(x, y) {
        let x_root = this.find(x);
        let y_root = this.find(y);
        if (x_root === y_root) {
            return;
        }
        if (this._rank[x_root] < this._rank[y_root]) {
            this._parent[x_root] = y_root;
        } else if (this._rank[x_root] > this._rank[y_root]) {
            this._parent[y_root] = x_root;
        } else {
            this._parent[y_root] = x_root;
            this._rank[x_root] += 1;
        }
    }
}

function map_view_position_to_score(view_pos) {
    if (view_pos === "PA") return 0;
    if (view_pos === "AP") return 1;
    return 2; // "LATERAL" or others
}

class ReportData {
    constructor(metadata={}, annotations={}) {
        this._metadata = metadata;
        this._annotations = cloneDeep(annotations);
        this.sort_dicom_id_view_pos_pairs();
    }
    sort_dicom_id_view_pos_pairs() {
        if (this._metadata.hasOwnProperty("dicom_id_view_pos_pairs")) {
            this._metadata["dicom_id_view_pos_pairs"].sort((a, b) => {
                return map_view_position_to_score(a[1]) - map_view_position_to_score(b[1]);
            });
        }            
    }
    get_custom_label_options(only_unused=false) {
        if (only_unused) {
            let unused_label_names = new Set(MERGED_LABEL_NAMES);
            Object.keys(this._metadata["chexpert_labels"]).forEach((label_name) => {
                unused_label_names.delete(label_name);
            });
            Object.keys(this._metadata["chest_imagenome_labels"]).forEach((label_name) => {
                unused_label_names.delete(label_name);
            });
            Object.keys(this._metadata["common_labels"]).forEach((label_name) => {
                unused_label_names.delete(label_name);
            });
            if (this._annotations.hasOwnProperty("custom_labels")) {
                this._annotations["custom_labels"].forEach((label) => {
                    unused_label_names.delete(label["label_name"]);
                });
            }
            unused_label_names = [...unused_label_names];
            unused_label_names.sort();
            const options = unused_label_names.map((label_name) => {
                return {
                    "label": label_name,
                    "value": label_name,
                };
            });
            return options;
        } else {
            const options = MERGED_LABEL_NAMES.map((label_name) => {
                return {
                    "label": label_name,
                    "value": label_name,
                };
            });
            return options;
        }
    }
    
    // Getters and setters for metadata
    get_metadata() {
        return this._metadata;
    }
    set_metadata(metadata) {
        this._metadata = metadata;
        this.sort_dicom_id_view_pos_pairs();
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
    get_dicom_ids() {
        return this._metadata["dicom_id_view_pos_pairs"].map((pair) => {
            return pair[0];
        });
    }
    get_dicom_id(index) {
        if (!this._metadata.hasOwnProperty("dicom_id_view_pos_pairs") ||
            index < 0 || index >= this._metadata["dicom_id_view_pos_pairs"].length) {
            return undefined;
        }
        return this._metadata["dicom_id_view_pos_pairs"][index][0];
    }
    get_view_pos(index) {
        if (!this._metadata.hasOwnProperty("dicom_id_view_pos_pairs") ||
            index < 0 || index >= this._metadata["dicom_id_view_pos_pairs"].length) {
            return undefined;
        }
        return this._metadata["dicom_id_view_pos_pairs"][index][1];
    }
    get_original_image_size(dicom_id) {
        return this._metadata["original_image_sizes"][dicom_id];
    }
    get_image_metadata(index) {
        if (!this._metadata.hasOwnProperty("dicom_id_view_pos_pairs") ||
            index < 0 || index >= this._metadata["dicom_id_view_pos_pairs"].length) {
            return undefined;
        }
        const dicom_id = this.get_dicom_id(index);
        const orig = this.get_original_image_size(dicom_id);
        return {
            part_id: this.get_part_id(),
            subject_id: this.get_subject_id(),
            study_id: this.get_study_id(),
            dicom_id: dicom_id,
            view_pos: this.get_view_pos(index),
            original_width: orig[0],
            original_height: orig[1],
            image_index: index,
        }
    }
    get_unused_report_text_index_pair_list() {
        if (this._unused_index_pair_list !== undefined) {
            return this._unused_index_pair_list;
        }
        const used_index_pair_list = [];
        for (let i = 0; i < LABEL_CATEGORIES.length; ++i) {
            Object.values(this._metadata[LABEL_CATEGORIES[i]]).forEach((ranges) => {
                ranges.forEach(range => used_index_pair_list.push(range));
            });
        }
        used_index_pair_list.sort((a, b) => a[0] - b[0]);
        const unused_index_pair_list = [];
        let prev = 0;
        for (let i = 0; i < used_index_pair_list.length; ++i) {
            if (used_index_pair_list[i][0] > prev) {
                unused_index_pair_list.push([prev, used_index_pair_list[i][0]]);
            }
            prev = used_index_pair_list[i][1];
        }
        if (prev < this._metadata["original_report"].length) {
            unused_index_pair_list.push([prev, this._metadata["original_report"].length]);
        }
        this._unused_index_pair_list = unused_index_pair_list;
        return unused_index_pair_list;
    }
    get_label_data() {
        // Check if list was already computed
        if (this._sorted_label_data !== undefined) {
            return this._sorted_label_data;
        }
        // Check if metadata is an empty object
        if (Object.keys(this._metadata).length === 0 && this._metadata.constructor === Object) {
            return undefined;
        }
        // Collect label data
        const label_data = [];
        for (let i = 0; i < 3; ++i) {
            Object.keys(this._metadata[LABEL_CATEGORIES[i]]).forEach((label_name) => {
                label_data.push({
                    "name": label_name,
                    "ranges": this._metadata[LABEL_CATEGORIES[i]][label_name],
                });
            });
        }
        // Find connected components of labels with overlapping ranges
        const uf = new UnionFind(label_data.length);
        for (let i = 0; i < label_data.length; ++i) {
            const ranges_i = label_data[i]["ranges"];
            for (let j = i + 1; j < label_data.length; ++j) {
                const ranges_j = label_data[j]["ranges"];
                let overlap_count = 0;
                for (let k = 0; k < ranges_i.length; ++k) {
                    for (let l = 0; l < ranges_j.length; ++l) {
                        const a = Math.max(ranges_i[k][0], ranges_j[l][0]);
                        const b = Math.min(ranges_i[k][1], ranges_j[l][1]);
                        if (a <= b && (b - a) / (ranges_i[k][1] - ranges_i[k][0]) >= 0.8 &&
                            (b - a) / (ranges_j[l][1] - ranges_j[l][0]) >= 0.8) {
                            overlap_count += 1;
                        }
                    }
                }
                if (overlap_count / Math.max(ranges_i.length, ranges_j.length) >= 0.7) {
                    uf.union(i, j);
                    // console.log(`Overlap between ${label_data[i]["name"]} and ${label_data[j]["name"]}`);
                }
            }
        }
        // for (let i = 0; i < label_data.length; ++i) {
        //     console.log(i, uf.find(i), label_data[i]["name"]);
        // }

        // Sort ranges by connected component and name
        const indices = new Array(label_data.length);
        for (let i = 0; i < label_data.length; ++i) indices[i] = i;
        indices.sort((a, b) => {
            const pa = uf.find(a);
            const pb = uf.find(b);
            const sa = label_data[pa]["ranges"][0][0];
            const sb = label_data[pb]["ranges"][0][0];
            if (sa !== sb) return sa - sb;
            return label_data[a]["name"].localeCompare(label_data[b]["name"]);
        });
        // console.log(indices);
        const sorted_label_data = [];
        for (let i = 0; i < label_data.length; ++i) {
            sorted_label_data.push(label_data[indices[i]]);
        }
        this._sorted_label_data = sorted_label_data; // Cache sorted label data
        return sorted_label_data;
    }

    // Getters and setters for annotations
    get_report_accuracy() {
        return this._annotations["report_accuracy"];
    }
    set_report_accuracy(report_accuracy) {
        this._annotations["report_accuracy"] = report_accuracy;
    }
    get_impression_accuracy() {
        return this._annotations["impression_accuracy"];
    }
    set_impression_accuracy(impression_accuracy) {
        this._annotations["impression_accuracy"] = impression_accuracy;
    }
    get_report_completeness() {
        return this._annotations["report_completeness"];
    }
    set_report_completeness(report_completeness) {
        this._annotations["report_completeness"] = report_completeness;
    }
    get_report_comment() {
        return this._annotations["report_comment"];
    }
    set_report_comment(report_comment) {
        this._annotations["report_comment"] = report_comment;
    }
    get_agreement_for_gt_label(label_name) {
        // console.log(`====== from get_agreement_for_gt_label (label_name: ${label_name}) ======`);
        // console.log(this._annotations["agreement_for_gt_label"]);
        if (!this._annotations.hasOwnProperty("agreement_for_gt_label") ||
            !this._annotations["agreement_for_gt_label"].hasOwnProperty(label_name)) {
            return undefined;
        }
        return this._annotations["agreement_for_gt_label"][label_name];
    }
    set_agreement_for_gt_label(label_name, agreement) {
        // console.log(`====== from set_agreement_for_gt_label (label_name: ${label_name}, agreement: ${agreement}) ======`);
        if (!this._annotations.hasOwnProperty("agreement_for_gt_label")) {
            this._annotations["agreement_for_gt_label"] = {};
        }
        this._annotations["agreement_for_gt_label"][label_name] = agreement;
        // console.log(`Set agreement for ${label_name} to ${agreement}`);
        // console.log(this._annotations["agreement_for_gt_label"]);
        // console.log('======');
    }
    set_text_agreement_for_gt_label(label_name, agreement) {
        if (!this._annotations.hasOwnProperty("text_agreement_for_gt_label")) {
            this._annotations["text_agreement_for_gt_label"] = {};
        }
        this._annotations["text_agreement_for_gt_label"][label_name] = agreement;
    }
    get_text_agreement_for_gt_label(label_name) {
        // console.log(`====== from get_text_agreement_for_gt_label (label_name: ${label_name}) ======`);
        // console.log(this._annotations["text_agreement_for_gt_label"]);
        if (!this._annotations.hasOwnProperty("text_agreement_for_gt_label") ||
            !this._annotations["text_agreement_for_gt_label"].hasOwnProperty(label_name)) {
            return undefined;
        }
        // console.log(`Get text agreement for ${label_name} = ${this._annotations["text_agreement_for_gt_label"][label_name]}`);
        return this._annotations["text_agreement_for_gt_label"][label_name];
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
    }
    get_polygons_for_gt_label(label_name, dicom_id, target_width=1, target_height=1) {
        if (!this._annotations.hasOwnProperty("polygons_for_gt_label") ||
            !this._annotations["polygons_for_gt_label"].hasOwnProperty(label_name) ||
            !this._annotations["polygons_for_gt_label"][label_name].hasOwnProperty(dicom_id)) {
            return [];
        }
        let polygons = this._annotations["polygons_for_gt_label"][label_name][dicom_id];
        if (target_width !== 1 || target_height !== 1) { // scale the polygons
            polygons = polygons.map(polygon => {
                return polygon.map(point => {
                    return [point[0] * target_width, point[1] * target_height];
                });
            });
        }
        return polygons;
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
        emit_event(APP_EVENTS.POLYGONS_UPDATED);
    }
    delete_polygon_for_gt_label(label_name, dicom_id, polygon_index) {
        if (!this._annotations.hasOwnProperty("polygons_for_gt_label") ||
            !this._annotations["polygons_for_gt_label"].hasOwnProperty(label_name) ||
            !this._annotations["polygons_for_gt_label"][label_name].hasOwnProperty(dicom_id) ||
            polygon_index < 0 || polygon_index >= this._annotations["polygons_for_gt_label"][label_name][dicom_id].length) {
            return;
        }
        this._annotations["polygons_for_gt_label"][label_name][dicom_id].splice(polygon_index, 1);
        emit_event(APP_EVENTS.POLYGONS_UPDATED);
    }
    pop_last_polygon_for_gt_label(label_name, dicom_id, delay_emit_event=false) {
        if (!this._annotations.hasOwnProperty("polygons_for_gt_label") ||
            !this._annotations["polygons_for_gt_label"].hasOwnProperty(label_name) ||
            !this._annotations["polygons_for_gt_label"][label_name].hasOwnProperty(dicom_id)) {
            return undefined;
        }
        const last_polygon = this._annotations["polygons_for_gt_label"][label_name][dicom_id].pop();
        if (!delay_emit_event) {
            emit_event(APP_EVENTS.POLYGONS_UPDATED);
        } else {
            setTimeout(() => emit_event(APP_EVENTS.POLYGONS_UPDATED), 0);
        }
        return last_polygon;
    }
    get_custom_labels() {
        if (!this._annotations.hasOwnProperty("custom_labels")) {
            return [];
        }
        return this._annotations["custom_labels"];
    }
    create_new_empty_custom_label() {
        if (!this._annotations.hasOwnProperty("custom_labels")) {
            this._annotations["custom_labels"] = [];
        }
        this._annotations["custom_labels"].push({
            "label_name": "",
            "label_source": "",
            "found_in_report": "",
            "agreement": "",
            "grounding": {},
            "id": CUSTOM_LABEL_ID
        });
        CUSTOM_LABEL_ID += 1;
    }
    get_custom_label_id(label_index) {
        if (!this._annotations.hasOwnProperty("custom_labels") ||
            label_index < 0 || label_index >= this._annotations["custom_labels"].length) {
            return undefined;
        }
        return this._annotations["custom_labels"][label_index]["id"];
    }
    get_last_custom_label_id() {
        if (!this._annotations.hasOwnProperty("custom_labels") ||
            this._annotations["custom_labels"].length === 0) {
            return undefined;
        }
        return this._annotations["custom_labels"][this._annotations["custom_labels"].length - 1]["id"];
    }
    get_custom_label_name(label_index) {
        if (!this._annotations.hasOwnProperty("custom_labels") ||
            label_index < 0 || label_index >= this._annotations["custom_labels"].length) {
            return undefined;
        }
        return this._annotations["custom_labels"][label_index]["label_name"];
    }
    get_custom_label_description(label_index) {
        if (!this._annotations.hasOwnProperty("custom_labels") ||
            label_index < 0 || label_index >= this._annotations["custom_labels"].length) {
            return undefined;
        }
        return this._annotations["custom_labels"][label_index]["label_description"];
    }
    get_found_in_report_for_custom_label(label_index) {
        if (!this._annotations.hasOwnProperty("custom_labels") ||
            label_index < 0 || label_index >= this._annotations["custom_labels"].length) {
            return undefined;
        }
        return this._annotations["custom_labels"][label_index]["found_in_report"];
    }
    get_agreement_for_custom_label(label_index) {
        if (!this._annotations.hasOwnProperty("custom_labels") ||
            label_index < 0 || label_index >= this._annotations["custom_labels"].length) {
            return undefined;
        }
        return this._annotations["custom_labels"][label_index]["agreement"];
    }
    get_label_source_for_custom_label(label_index) {
        if (!this._annotations.hasOwnProperty("custom_labels") ||
            label_index < 0 || label_index >= this._annotations["custom_labels"].length) {
            return undefined;
        }
        return this._annotations["custom_labels"][label_index]["label_source"];
    }
    get_has_grounding_for_custom_label(label_index, dicom_id) {
        if (!this._annotations.hasOwnProperty("custom_labels") ||
            label_index < 0 || label_index >= this._annotations["custom_labels"].length ||
            !this._annotations["custom_labels"][label_index].hasOwnProperty("grounding") ||
            !this._annotations["custom_labels"][label_index]["grounding"].hasOwnProperty(dicom_id)) {
            return undefined;
        }
        return this._annotations["custom_labels"][label_index]["grounding"][dicom_id]["has_grounding"];
    }
    set_custom_label_name(label_index, label_name) {
        if (!this._annotations.hasOwnProperty("custom_labels") ||
            label_index < 0 || label_index >= this._annotations["custom_labels"].length) {
            return;
        }
        this._annotations["custom_labels"][label_index]["label_name"] = label_name;
        // console.log("Emitting event: " + APP_EVENTS.CUSTOM_LABEL_NAME_CHANGED);
        emit_event(APP_EVENTS.CUSTOM_LABEL_NAME_CHANGED);
    }
    set_custom_label_description(label_index, label_description) {
        if (!this._annotations.hasOwnProperty("custom_labels") ||
            label_index < 0 || label_index >= this._annotations["custom_labels"].length) {
            return;
        }
        this._annotations["custom_labels"][label_index]["label_description"] = label_description;
    }
    set_agreement_for_custom_label(label_index, agreement) {
        if (!this._annotations.hasOwnProperty("custom_labels") ||
            label_index < 0 || label_index >= this._annotations["custom_labels"].length) {
            return;
        }
        this._annotations["custom_labels"][label_index]["agreement"] = agreement;
    }
    set_found_in_report_for_custom_label(label_index, found_in_report) {
        if (!this._annotations.hasOwnProperty("custom_labels") ||
            label_index < 0 || label_index >= this._annotations["custom_labels"].length) {
            return;
        }
        this._annotations["custom_labels"][label_index]["found_in_report"] = found_in_report;
    }
    set_has_grounding_for_custom_label(label_index, dicom_id, has_grounding) {
        if (!this._annotations.hasOwnProperty("custom_labels") ||
            label_index < 0 || label_index >= this._annotations["custom_labels"].length) {
            return;
        }
        if (!this._annotations["custom_labels"][label_index].hasOwnProperty("grounding")) {
            this._annotations["custom_labels"][label_index]["grounding"] = {};
        }
        if (!this._annotations["custom_labels"][label_index]["grounding"].hasOwnProperty(dicom_id)) {
            this._annotations["custom_labels"][label_index]["grounding"][dicom_id] = {};
        }
        this._annotations["custom_labels"][label_index]["grounding"][dicom_id]["has_grounding"] = has_grounding;
    }
    get_polygons_for_custom_label(label_index, dicom_id, target_width=1, target_height=1) {
        if (!this._annotations.hasOwnProperty("custom_labels") ||
            label_index < 0 || label_index >= this._annotations["custom_labels"].length ||
            !this._annotations["custom_labels"][label_index].hasOwnProperty("grounding") ||
            !this._annotations["custom_labels"][label_index]["grounding"].hasOwnProperty(dicom_id) ||
            !this._annotations["custom_labels"][label_index]["grounding"][dicom_id].hasOwnProperty("polygons")) {
            return [];
        }
        let polygons = this._annotations["custom_labels"][label_index]["grounding"][dicom_id]["polygons"];
        if (target_width !== 1 || target_height !== 1) { // scale the polygons
            polygons = polygons.map(polygon => {
                return polygon.map(point => {
                    return [point[0] * target_width, point[1] * target_height];
                });
            });
        }
        return polygons;
    }
    get_all_polygons_for_dicom_id(dicom_id, target_width=1, target_height=1, return_label_names=false) {
        let polygons = [];
        let label_names = [];
        // polygons from ground truth labels
        if (this._annotations.hasOwnProperty("polygons_for_gt_label")) {
            Object.keys(this._annotations["polygons_for_gt_label"]).forEach((label_name) => {
                if (this._annotations["polygons_for_gt_label"][label_name].hasOwnProperty(dicom_id)) {
                    polygons.push(this._annotations["polygons_for_gt_label"][label_name][dicom_id]);
                    if (return_label_names) label_names.push(label_name);
                }
            });
        }
        // polygons from custom labels
        if (this._annotations.hasOwnProperty("custom_labels")) {
            for (let i = 0; i < this._annotations["custom_labels"].length; i++) {
                if (this._annotations["custom_labels"][i].hasOwnProperty("grounding") &&
                    this._annotations["custom_labels"][i]["grounding"].hasOwnProperty(dicom_id) &&
                    this._annotations["custom_labels"][i]["grounding"][dicom_id].hasOwnProperty("polygons")) {
                    polygons.push(this._annotations["custom_labels"][i]["grounding"][dicom_id]["polygons"]);
                    if (return_label_names) label_names.push(this._annotations["custom_labels"][i]["label_name"]);
                }
            }
        }
        if (target_width !== 1 || target_height !== 1) {            
            // we need to denormalize the polygons to match the target width and height
            const denormalized_polygons = [];
            for (let i = 0; i < polygons.length; i++) { // for each label
                denormalized_polygons.push([]);
                for (let j = 0; j < polygons[i].length; j++) { // for each polygon
                    const denormalized_polygon = [];
                    for (let k = 0; k < polygons[i][j].length; k++) { // for each point
                        denormalized_polygon.push([
                            polygons[i][j][k][0] * target_width, // x
                            polygons[i][j][k][1] * target_height // y
                        ]);
                    }
                    denormalized_polygons[i].push(denormalized_polygon);
                }
            }
            polygons = denormalized_polygons;
        }
        if (return_label_names) {
            return [polygons, label_names];
        } else {
            return polygons;
        }
    }
    add_polygon_for_custom_label(label_index, dicom_id, polygon) {
        if (!this._annotations.hasOwnProperty("custom_labels") ||
            label_index < 0 || label_index >= this._annotations["custom_labels"].length) {
        }
        if (!this._annotations["custom_labels"][label_index].hasOwnProperty("grounding")) {
            this._annotations["custom_labels"][label_index]["grounding"] = {};
        }
        if (!this._annotations["custom_labels"][label_index]["grounding"].hasOwnProperty(dicom_id)) {
            this._annotations["custom_labels"][label_index]["grounding"][dicom_id] = {};
        }
        if (!this._annotations["custom_labels"][label_index]["grounding"][dicom_id].hasOwnProperty("polygons")) {
            this._annotations["custom_labels"][label_index]["grounding"][dicom_id]["polygons"] = [];
        }
        this._annotations["custom_labels"][label_index]["grounding"][dicom_id]["polygons"].push(polygon);
        emit_event(APP_EVENTS.POLYGONS_UPDATED);
    }
    delete_polygon_for_custom_label(label_index, dicom_id, polygon_index) {
        if (!this._annotations.hasOwnProperty("custom_labels") ||
            label_index < 0 || label_index >= this._annotations["custom_labels"].length ||
            !this._annotations["custom_labels"][label_index].hasOwnProperty("grounding") ||
            !this._annotations["custom_labels"][label_index]["grounding"].hasOwnProperty(dicom_id) ||
            !this._annotations["custom_labels"][label_index]["grounding"][dicom_id].hasOwnProperty("polygons") ||
            polygon_index < 0 || polygon_index >= this._annotations["custom_labels"][label_index]["grounding"][dicom_id]["polygons"].length) {
            return;
        }
        this._annotations["custom_labels"][label_index]["grounding"][dicom_id]["polygons"].splice(polygon_index, 1);
        emit_event(APP_EVENTS.POLYGONS_UPDATED);
    }
    pop_last_polygon_for_custom_label(label_index, dicom_id, delay_emit_event=false) {
        if (!this._annotations.hasOwnProperty("custom_labels") ||
            label_index < 0 || label_index >= this._annotations["custom_labels"].length ||
            !this._annotations["custom_labels"][label_index].hasOwnProperty("grounding") ||
            !this._annotations["custom_labels"][label_index]["grounding"].hasOwnProperty(dicom_id) ||
            !this._annotations["custom_labels"][label_index]["grounding"][dicom_id].hasOwnProperty("polygons") ||
            this._annotations["custom_labels"][label_index]["grounding"][dicom_id]["polygons"].length === 0) {
            return undefined;
        }
        const polygon = this._annotations["custom_labels"][label_index]["grounding"][dicom_id]["polygons"].pop();
        if (!delay_emit_event) {
            emit_event(APP_EVENTS.POLYGONS_UPDATED);
        } else {
            setTimeout(() => emit_event(APP_EVENTS.POLYGONS_UPDATED), 0);
        }

        return polygon;
    }
    set_label_source_for_custom_label(label_index, label_source) {
        if (!this._annotations.hasOwnProperty("custom_labels") ||
            label_index < 0 || label_index >= this._annotations["custom_labels"].length) {
            return;
        }
        this._annotations["custom_labels"][label_index]["label_source"] = label_source;
    }
    delete_custom_label(label_index) {
        if (!this._annotations.hasOwnProperty("custom_labels") ||
            label_index < 0 || label_index >= this._annotations["custom_labels"].length) {
            return;
        }
        this._annotations["custom_labels"].splice(label_index, 1);
    }
    get_feedback_for_gt_label_annotations(label_name) {
        let done = true;
        const messages = [];
        // 1. Whether the label is present in the report
        if (is_value_empty(this.get_text_agreement_for_gt_label(label_name))) {
            done = false;
            messages.push("Answer missing for question about whether the label is present in the report.");
        }
        // 2. Whether the label is accurate
        if (is_value_empty(this.get_agreement_for_gt_label(label_name))) {
            done = false;
            messages.push("Answer missing for question about whether the label is accurate.");
        }
        // 3. Whether the label is grounded in the image
        const dicom_ids = this.get_dicom_ids();
        for (let i = 0; i < dicom_ids.length; i++) {
            if (is_value_empty(this.get_has_grounding_for_gt_label(label_name, dicom_ids[i]))) {
                done = false;
                messages.push(`Answer missing for question about whether the label can be seen in image ${i+1}.`);
            } else if (
                    this.get_has_grounding_for_gt_label(label_name, dicom_ids[i]) == "Yes" &&
                    this.get_polygons_for_gt_label(label_name, dicom_ids[i]).length === 0) {
                done = false;
                messages.push(`You said that the label can be seen in image ${i+1}, but you did not provide any polygons to ground the label.`);
            }
        }
        // 4. Whether the images are sufficient to identify the label
        if (is_value_empty(this.get_label_source_for_gt_label(label_name))) {
            done = false;
            messages.push("Answer missing for question about whether the images are sufficient to identify the label.");
        }
        // Return the feedback
        return { done, messages };
    }
    get_feedback_for_custom_label_annotations(label_index) {
        let done = true;
        const messages = [];
        // 1. Whether the label was given a name
        if (is_value_empty(this.get_custom_label_name(label_index))) {
            done = false;
            messages.push("Name for label missing.");
        }
        // 2. Whether the label is accurate
        if (is_value_empty(this.get_agreement_for_custom_label(label_index))) {
            done = false;
            messages.push("Answer missing for question about whether the label is accurate.");
        }
        // 3. Whether the label is mentioned in the report
        if (is_value_empty(this.get_found_in_report_for_custom_label(label_index))) {
            done = false;
            messages.push("Answer missing for question about whether the label is mentioned in the report.");
        }
        // 4. Whether the label is grounded in the image
        const dicom_ids = this.get_dicom_ids();
        for (let i = 0; i < dicom_ids.length; i++) {
            if (is_value_empty(this.get_has_grounding_for_custom_label(label_index, dicom_ids[i]))) {
                done = false;
                messages.push(`Answer missing for question about whether the label can be seen in image ${i+1}.`);
            } else if (
                    this.get_has_grounding_for_custom_label(label_index, dicom_ids[i]) == "Yes" &&
                    this.get_polygons_for_custom_label(label_index, dicom_ids[i]).length === 0) {
                done = false;
                messages.push(`You said that the label can be seen in image ${i+1}, but you did not provide any polygons to ground the label.`);
            }
        }
        // 5. Whether the images are sufficient to identify the label
        if (is_value_empty(this.get_label_source_for_custom_label(label_index))) {
            done = false;
            messages.push("Answer missing for question about whether the images are sufficient to identify the label.");
        }
        // Return the feedback
        return { done, messages };
    }
    get_feedback_for_report_annotation(field_name) {
        let done = true;
        if (field_name === "report_accuracy") {
            if (is_value_empty(this.get_report_accuracy())) {
                done = false;
            }
        } else if (field_name === "report_completeness") {
            if (is_value_empty(this.get_report_completeness())) {
                done = false;
            }
        } else if (field_name === "impression_accuracy") {
            if (is_value_empty(this.get_impression_accuracy())) {
                done = false;
            }
        }
        return { done };
    }
}

export default ReportData;