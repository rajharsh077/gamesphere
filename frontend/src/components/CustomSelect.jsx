import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomSelect = ({
  value,
  onChange,
  options,
  icon: LeftIcon,
  placeholder = 'Select option',
  id,
  className = '',
  menuClassName = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const ActiveIcon = selectedOption?.icon || LeftIcon;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-white outline-none transition duration-300 hover:border-indigo-500/50 hover:bg-slate-900/60 focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 font-bold cursor-pointer ${className}`}
      >
        <div className="flex items-center gap-2 text-left">
          {ActiveIcon && <ActiveIcon className="h-4 w-4 text-indigo-400 shrink-0" />}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-400 shrink-0"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute z-50 mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/95 p-1.5 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl ${menuClassName}`}
          >
            <div className="max-h-60 overflow-y-auto space-y-1">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                const OptIcon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-650 bg-indigo-600 text-white font-bold'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-left">
                      {OptIcon && (
                        <OptIcon
                          className={`h-4 w-4 shrink-0 ${
                            isSelected ? 'text-white' : 'text-slate-400'
                          }`}
                        />
                      )}
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomSelect;
