const Module = require('../models/module');

exports.createModule = async (req, res) => {
    try {
        const newModule = new Module(req.body);
        await newModule.save();
        res.status(201).json(newModule);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getModules = async (req, res) => {
    try {
        const modules = await Module.find();
        res.json(modules);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateModule = async (req, res) => {
    try {
        const updatedModule = await Module.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedModule);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteModule = async (req, res) => {
    try {
        await Module.findByIdAndDelete(req.params.id);
        res.json({ message: 'Module deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
