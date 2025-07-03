import React, { Fragment, useState } from 'react';
import { FilterOptions } from '../../types';
import { Filter as FilterIcon, ChevronsUpDownIcon, Check, X, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Listbox, Transition } from '@headlessui/react';

interface FilterPanelProps {
  filters: FilterOptions;
  onFilterChange: (filterName: keyof FilterOptions, value: any) => void;
  marketplaces: string[];
  warehouses: string[];
  departments: string[];
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFilterChange,
  marketplaces,
  warehouses,
  departments,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h2 className="text-base sm:text-lg font-medium text-neutral-900 flex items-center">
          <FilterIcon className="h-4 w-4 mr-1.5 text-neutral-500" />
          Фильтры
        </h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>
      </div>
      
      {isExpanded && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            <CustomFilter 
              label="Маркетплейс"
              value={filters.marketplace}
              options={marketplaces}
              placeholder="Все маркетплейсы"
              onChange={(value) => onFilterChange('marketplace', value)}
              color="ozon"
            />
            
            <CustomFilter 
              label={`Склад отгрузки${filters.marketplace ? ` (${filters.marketplace})` : ''}`}
              value={filters.warehouse}
              options={warehouses}
              placeholder={filters.marketplace ? `Все склады ${filters.marketplace}` : "Все склады"}
              onChange={(value) => onFilterChange('warehouse', value)}
              color="wildberries"
              disabled={warehouses.length === 0}
            />
            
            <MultiSelectFilter 
              label="Подразделение"
              value={filters.department || []}
              options={departments}
              placeholder="Все подразделения"
              onChange={(value) => onFilterChange('department', value)}
              color="yandex"
            />
          </div>
          
          <div className="mt-2 sm:mt-3">
            <h3 className="text-xs sm:text-sm font-medium text-neutral-700 mb-1 sm:mb-1.5 flex items-center">
              <Calendar className="h-3 sm:h-4 w-3 sm:w-4 mr-1 text-ozon" /> 
              Период дат
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="flex flex-col">
                <label className="text-xs font-medium text-neutral-700 mb-0.5 sm:mb-1">Начальная дата</label>
                <input 
                  type="date" 
                  className="rounded-lg border border-neutral-200 py-1 sm:py-1.5 px-2 sm:px-2.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-ozon focus:border-transparent transition-all duration-150 hover:border-neutral-300"
                  value={filters.startDate || ''}
                  onChange={(e) => onFilterChange('startDate', e.target.value || null)}
                />
                {filters.startDate && (
                  <button 
                    onClick={() => onFilterChange('startDate', null)}
                    className="text-xs text-neutral-400 hover:text-neutral-600 mt-0.5 self-end"
                  >
                    Сбросить
                  </button>
                )}
              </div>
              
              <div className="flex flex-col">
                <label className="text-xs font-medium text-neutral-700 mb-0.5 sm:mb-1">Конечная дата</label>
                <input 
                  type="date" 
                  className="rounded-lg border border-neutral-200 py-1 sm:py-1.5 px-2 sm:px-2.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-ozon focus:border-transparent transition-all duration-150 hover:border-neutral-300"
                  value={filters.endDate || ''}
                  onChange={(e) => onFilterChange('endDate', e.target.value || null)}
                  min={filters.startDate || undefined}
                />
                {filters.endDate && (
                  <button 
                    onClick={() => onFilterChange('endDate', null)}
                    className="text-xs text-neutral-400 hover:text-neutral-600 mt-0.5 self-end"
                  >
                    Сбросить
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface CustomFilterProps {
  label: string;
  value: string | null;
  options: string[];
  placeholder: string;
  onChange: (value: string | null) => void;
  color: 'ozon' | 'wildberries' | 'yandex';
  disabled?: boolean;
}

interface MultiSelectFilterProps {
  label: string;
  value: string[];
  options: string[];
  placeholder: string;
  onChange: (value: string[] | null) => void;
  color: 'ozon' | 'wildberries' | 'yandex';
}

const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  label,
  value,
  options,
  placeholder,
  onChange,
  color
}) => {
  const getColorClasses = () => {
    switch (color) {
      case 'ozon':
        return {
          bg: 'bg-ozon',
          hover: 'hover:bg-ozon-light hover:text-ozon-dark',
          focus: 'focus:ring-ozon',
          active: 'text-ozon',
          dot: 'bg-ozon'
        };
      case 'wildberries':
        return {
          bg: 'bg-wildberries',
          hover: 'hover:bg-wildberries-light hover:text-wildberries-dark',
          focus: 'focus:ring-wildberries',
          active: 'text-wildberries',
          dot: 'bg-wildberries'
        };
      case 'yandex':
        return {
          bg: 'bg-yandex',
          hover: 'hover:bg-yandex-light hover:text-yandex-dark',
          focus: 'focus:ring-yandex',
          active: 'text-yandex',
          dot: 'bg-yandex'
        };
      default:
        return {
          bg: 'bg-ozon',
          hover: 'hover:bg-ozon-light hover:text-ozon-dark',
          focus: 'focus:ring-ozon',
          active: 'text-ozon',
          dot: 'bg-ozon'
        };
    }
  };
  
  const colorClasses = getColorClasses();
  
  const handleToggleOption = (option: string) => {
    if (value.includes(option)) {
      // Если опция уже выбрана, убираем её из массива
      const newValue = value.filter(item => item !== option);
      onChange(newValue.length > 0 ? newValue : null);
    } else {
      // Иначе добавляем опцию в массив
      const newValue = [...value, option];
      onChange(newValue);
    }
  };
  
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-0.5 sm:mb-1.5">
        <div className="text-xs font-medium text-neutral-700">
          {label}
        </div>
        {value.length > 0 && (
          <button 
            onClick={() => onChange(null)}
            className="text-xs text-neutral-400 hover:text-neutral-600"
          >
            Сбросить
          </button>
        )}
      </div>
      
      <Listbox
        value={value}
        onChange={(values) => onChange(values.length ? values : null)}
        multiple
      >
        {({ open }) => (
          <div className="relative">
            <Listbox.Button className={`
              relative w-full cursor-pointer rounded-lg border border-neutral-200 
              bg-white py-1 sm:py-1.5 pl-2 sm:pl-3 pr-8 sm:pr-10 text-left shadow-sm 
              ${colorClasses.focus} focus:outline-none focus:ring-1 focus:border-transparent
              transition-all duration-150 hover:border-neutral-300
              text-xs sm:text-sm
              ${value.length > 0 ? 'text-neutral-900 font-medium' : 'text-neutral-500'}
            `}>
              <span className="block truncate">
                {value.length === 0
                  ? placeholder
                  : value.length === 1
                  ? value[0]
                  : `${value.length} выбрано`}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3">
                <ChevronsUpDownIcon
                  className="h-3 sm:h-4 w-3 sm:w-4 text-neutral-400"
                  aria-hidden="true"
                />
              </span>
            </Listbox.Button>
            
            <Transition
              show={open}
              as={Fragment}
              enter="transition ease-out duration-150"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-100"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Listbox.Options className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-xs sm:text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                {options.map((option) => (
                  <Listbox.Option
                    key={option}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-1 sm:py-1.5 pl-3 sm:pl-3.5 pr-10 ${
                        active ? `${colorClasses.hover}` : 'text-neutral-900'
                      }`
                    }
                    value={option}
                  >
                    {({ selected, active }) => (
                      <>
                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                          {option}
                        </span>
                        {selected && (
                          <span
                            className={`absolute inset-y-0 right-0 flex items-center pr-3 ${
                              active ? 'text-white' : colorClasses.active
                            }`}
                          >
                            <Check className="h-3 sm:h-4 w-3 sm:w-4" />
                          </span>
                        )}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        )}
      </Listbox>
    </div>
  );
};

const CustomFilter: React.FC<CustomFilterProps> = ({
  label,
  value,
  options,
  placeholder,
  onChange,
  color,
  disabled = false
}) => {
  const getColorClasses = () => {
    switch (color) {
      case 'ozon':
        return {
          bg: 'bg-ozon',
          hover: 'hover:bg-ozon-light hover:text-ozon-dark',
          focus: 'focus:ring-ozon',
          active: 'text-ozon',
          dot: 'bg-ozon'
        };
      case 'wildberries':
        return {
          bg: 'bg-wildberries',
          hover: 'hover:bg-wildberries-light hover:text-wildberries-dark',
          focus: 'focus:ring-wildberries',
          active: 'text-wildberries',
          dot: 'bg-wildberries'
        };
      case 'yandex':
        return {
          bg: 'bg-yandex',
          hover: 'hover:bg-yandex-light hover:text-yandex-dark',
          focus: 'focus:ring-yandex',
          active: 'text-yandex',
          dot: 'bg-yandex'
        };
      default:
        return {
          bg: 'bg-ozon',
          hover: 'hover:bg-ozon-light hover:text-ozon-dark',
          focus: 'focus:ring-ozon',
          active: 'text-ozon',
          dot: 'bg-ozon'
        };
    }
  };
  
  const colorClasses = getColorClasses();
  
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-0.5 sm:mb-1.5">
        <div className="text-xs font-medium text-neutral-700">
          {label}
        </div>
        {value && (
          <button 
            onClick={() => onChange(null)}
            className="text-xs text-neutral-400 hover:text-neutral-600"
          >
            Сбросить
          </button>
        )}
      </div>
      
      <Listbox
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        {({ open }) => (
          <div className="relative">
            <Listbox.Button className={`
              relative w-full cursor-pointer rounded-lg border border-neutral-200 
              bg-white py-1 sm:py-1.5 pl-2 sm:pl-3 pr-8 sm:pr-10 text-left shadow-sm 
              ${colorClasses.focus} focus:outline-none focus:ring-1 focus:border-transparent
              transition-all duration-150 hover:border-neutral-300
              text-xs sm:text-sm
              ${disabled ? 'bg-neutral-50 text-neutral-400 cursor-not-allowed' : ''}
              ${value ? 'text-neutral-900 font-medium' : 'text-neutral-500'}
            `}>
              <span className="block truncate">
                {value || placeholder}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3">
                <ChevronsUpDownIcon
                  className="h-3 sm:h-4 w-3 sm:w-4 text-neutral-400"
                  aria-hidden="true"
                />
              </span>
            </Listbox.Button>
            
            <Transition
              show={open}
              as={Fragment}
              enter="transition ease-out duration-150"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-100"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Listbox.Options className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-xs sm:text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                {options.map((option) => (
                  <Listbox.Option
                    key={option}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-1 sm:py-1.5 pl-3 sm:pl-3.5 pr-10 ${
                        active ? `${colorClasses.hover}` : 'text-neutral-900'
                      }`
                    }
                    value={option}
                  >
                    {({ selected, active }) => (
                      <>
                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                          {option}
                        </span>
                        {selected && (
                          <span
                            className={`absolute inset-y-0 right-0 flex items-center pr-3 ${
                              active ? 'text-white' : colorClasses.active
                            }`}
                          >
                            <Check className="h-3 sm:h-4 w-3 sm:w-4" />
                          </span>
                        )}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        )}
      </Listbox>
    </div>
  );
};

export default FilterPanel;